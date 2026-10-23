import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Headphones,
  MessageSquare,
  Mic,
  MicOff,
  Play,
  Send,
  Square,
  Volume2,
} from "lucide-react";
import { api } from "./api";
import type { Brief, Capabilities, Material, Project } from "./types";
import { LABELS } from "./types";

type Props = {
  project: Project;
  brief: Brief;
  material: Material;
  page: number;
  setPage: (i: number) => void;
  onRefresh: () => Promise<void>;
  caps: Capabilities;
  onSettings: () => void;
  onRevise: () => Promise<void>;
  busy: boolean;
  notice: (s: string) => void;
};
export function Review({
  project,
  brief,
  material,
  page,
  setPage,
  onRefresh,
  caps,
  onSettings,
  onRevise,
  busy,
  notice,
}: Props) {
  const [note, setNote] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [live, setLive] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [recording, setRecording] = useState(false);
  const session = useRef<{
    pc: RTCPeerConnection;
    dc: RTCDataChannel;
    audio: HTMLAudioElement;
    stream: MediaStream;
  } | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const recordTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageRef = useRef(page);
  const projectRef = useRef(project);
  projectRef.current = project;
  const save = async (text: string, slide = page) => {
    if (!text.trim()) return;
    await api(`/api/briefs/${brief.id}/notes`, { body: text, slide });
    await onRefresh();
  };
  const stop = () => {
    const s = session.current;
    if (s) {
      session.current = null;
      s.stream.getTracks().forEach((t) => t.stop());
      s.dc.close();
      s.pc.close();
      s.audio.pause();
      s.audio.srcObject = null;
    }
    setLive(false);
    setConnecting(false);
  };
  useEffect(
    () => () => {
      stop();
      if (recorder.current?.state === "recording") recorder.current.stop();
      if (recordTimer.current) clearTimeout(recordTimer.current);
      window.speechSynthesis?.cancel();
    },
    [brief.id],
  );
  useEffect(() => {
    pageRef.current = page;
    const s = session.current;
    if (s?.dc.readyState === "open") {
      s.dc.send(
        JSON.stringify({
          type: "conversation.item.create",
          item: {
            type: "message",
            role: "user",
            content: [
              {
                type: "input_text",
                text: `Now review section ${page + 1}: ${material.sections[page].title}. Ask for feedback. Save proposed edits as notes; do not claim changes were applied.`,
              },
            ],
          },
        }),
      );
      s.dc.send(JSON.stringify({ type: "response.create" }));
    }
  }, [page]);
  async function voice() {
    if (!caps.ai) {
      onSettings();
      notice(
        "Connect an API key privately in Settings to start live AI voice. Typed review works now.",
      );
      return;
    }
    setConnecting(true);
    try {
      const pc = new RTCPeerConnection();
      const audio = new Audio();
      audio.autoplay = true;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getAudioTracks().forEach((t) => pc.addTrack(t, stream));
      const dc = pc.createDataChannel("oai-events");
      session.current = { pc, audio, stream, dc };
      pc.ontrack = (e) => {
        audio.srcObject = e.streams[0];
        void audio
          .play()
          .catch(() => notice("Allow audio playback to hear the reviewer."));
      };
      dc.onopen = () => {
        setLive(true);
        setConnecting(false);
        dc.send(
          JSON.stringify({
            type: "response.create",
            response: {
              instructions: `Introduce yourself as an AI reviewer. We are reviewing section ${pageRef.current + 1}: ${material.sections[pageRef.current].title}, focusing on ${LABELS[brief.kind]}. Ask what to improve.`,
            },
          }),
        );
      };
      dc.onmessage = async (e) => {
        try {
          const ev = JSON.parse(e.data);
          if (
            ev.type === "response.output_audio_transcript.done" ||
            ev.type === "response.audio_transcript.done"
          )
            setTranscript(ev.transcript || "");
          if (ev.type === "error")
            notice(ev.error?.message || "Voice service error.");
          if (
            ev.type === "response.function_call_arguments.done" &&
            ev.name === "record_review_note"
          ) {
            let output;
            try {
              const args = JSON.parse(ev.arguments);
              await save(args.note, args.slide);
              output = {
                saved: true,
                message: "Saved as a proposed review note; not applied.",
              };
            } catch (error) {
              output = { saved: false, error: String(error) };
            }
            dc.send(
              JSON.stringify({
                type: "conversation.item.create",
                item: {
                  type: "function_call_output",
                  call_id: ev.call_id,
                  output: JSON.stringify(output),
                },
              }),
            );
            dc.send(JSON.stringify({ type: "response.create" }));
          }
        } catch (error) {
          notice(String(error));
        }
      };
      pc.onconnectionstatechange = () => {
        if (["failed", "disconnected"].includes(pc.connectionState)) {
          stop();
          notice("Voice connection ended. Saved feedback is preserved.");
        }
      };
      await pc.setLocalDescription(await pc.createOffer());
      if (pc.iceGatheringState !== "complete")
        await Promise.race([
          new Promise<void>((resolve) =>
            pc.addEventListener("icegatheringstatechange", () => {
              if (pc.iceGatheringState === "complete") resolve();
            }),
          ),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("Voice connection timed out.")),
              10000,
            ),
          ),
        ]);
      const sdp = await api<string>("/api/voice", {
        briefId: brief.id,
        projectId: project.id,
        sdp: pc.localDescription!.sdp,
      });
      await pc.setRemoteDescription({ type: "answer", sdp });
    } catch (error) {
      stop();
      notice(error instanceof Error ? error.message : String(error));
    }
  }
  async function record() {
    if (recording) {
      recorder.current?.stop();
      return;
    }
    if (!caps.ai) {
      onSettings();
      notice("Connect an API key for recorded-speech transcription.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";
      const r = new MediaRecorder(stream, mime ? { mimeType: mime } : {});
      const chunks: BlobPart[] = [];
      const slide = page;
      r.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      r.onstop = async () => {
        setRecording(false);
        stream.getTracks().forEach((t) => t.stop());
        if (recordTimer.current) clearTimeout(recordTimer.current);
        try {
          const form = new FormData();
          form.append(
            "audio",
            new Blob(chunks, { type: r.mimeType }),
            "feedback.webm",
          );
          notice("Transcribing feedback…");
          const t = await api<{ text: string }>("/api/transcribe", form);
          if (t.text.trim()) {
            await save(t.text, slide);
            notice("Speech saved as section feedback.");
          }
        } catch (error) {
          notice(String(error));
        }
      };
      recorder.current = r;
      r.start();
      setRecording(true);
      recordTimer.current = setTimeout(() => {
        if (r.state === "recording") r.stop();
      }, 120000);
    } catch (error) {
      notice(String(error));
    }
  }
  const pending = brief.notes.filter((n) => n.state === "pending");
  const notes = brief.notes.filter((n) => n.slide === page);
  const sample =
    brief.kind === "bond"
      ? "Increase the spread to 175 bps and show the downside first."
      : brief.kind === "buyback"
        ? "Change the execution price to $140 and show the downside first."
        : "Change the premium to 30% and the synergies to 100 million. Show the downside first.";
  const end = async () => {
    stop();
    if (
      projectRef.current.analyses
        .find((a) => a.id === brief.id)
        ?.notes.some((n) => n.state === "pending")
    )
      await onRevise();
  };
  return (
    <div className="review-layout">
      <div className="review-agenda">
        <span className="eyebrow">REVIEW AGENDA</span>
        <h2>Walk through the story.</h2>
        <p>
          Discuss the materials section by section. Capture edits, then return a
          revised draft to the workspace.
        </p>
        {material.sections.map((s, i) => (
          <button
            key={s.id}
            className={`agenda-item ${i === page ? "selected" : ""}`}
            onClick={() => setPage(i)}
          >
            <span>{String(i + 1).padStart(2, "0")}</span>
            <div>
              {s.title}
              <small>
                {brief.notes.filter(
                  (n) => n.slide === i && n.state === "pending",
                ).length || "No"}{" "}
                pending notes
              </small>
            </div>
            {i === page && <ArrowRight size={15} />}
          </button>
        ))}
        <div className="review-mode">
          <span className="binding-dot" />
          <strong>
            {caps.ai
              ? "AI interpretation connected"
              : "Structured local review"}
          </strong>
          <p>
            {caps.ai
              ? "Model proposes edits; the financial engine validates and recalculates."
              : "Supported numeric edits work without an API key. Other requests remain visible for clarification."}
          </p>
        </div>
      </div>
      <div className="meeting-column">
        <section className={`meeting-room ${live ? "live" : ""}`}>
          <div className="meeting-top">
            <span>
              <span className={`status-dot ${live ? "orange" : ""}`} />
              {live
                ? "LIVE AI REVIEW"
                : connecting
                  ? "CONNECTING"
                  : "DRAFT REVIEW ROOM"}
            </span>
            <span>{LABELS[brief.kind]}</span>
          </div>
          <div className="meeting-orb">
            <Headphones size={33} strokeWidth={1} />
            <i />
            <i />
          </div>
          <h3>
            {live
              ? "Let’s refine the client story."
              : "Better materials start with a conversation."}
          </h3>
          <p>
            {live
              ? transcript ||
                "The AI reviewer is listening. Financial changes are saved as proposed notes."
              : `Section ${page + 1}: ${material.sections[page].title}. Start an AI voice review or capture feedback below.`}
          </p>
          <div className="meeting-actions">
            {live ? (
              <button className="btn navy" onClick={() => void end()}>
                <Square size={14} />
                End meeting & revise
              </button>
            ) : (
              <button
                className="btn navy"
                disabled={connecting}
                onClick={() => void voice()}
              >
                <Mic size={15} />
                {connecting ? "Connecting…" : "Start voice review"}
              </button>
            )}
            <button
              className="btn"
              disabled={live}
              onClick={() => {
                if (!window.speechSynthesis) {
                  notice("Device narration is not available.");
                  return;
                }
                window.speechSynthesis.cancel();
                window.speechSynthesis.speak(
                  new SpeechSynthesisUtterance(
                    `Device narration. ${material.sections[page].title}. ${brief.model.summary}`,
                  ),
                );
              }}
            >
              <Volume2 size={15} />
              Read section
            </button>
          </div>
          <small>
            AI voice requires API access. “Read section” uses the device voice.
          </small>
        </section>
        <section className="white-panel review-notes">
          <div className="panel-title">
            <h3>Section feedback</h3>
            <span className="tiny-tag">{notes.length} notes</span>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void save(note)
                .then(() => {
                  setNote("");
                  notice("Feedback saved.");
                })
                .catch((error) => notice(String(error)));
            }}
          >
            <textarea
              aria-label="Section feedback"
              placeholder="What should change in this section?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={5000}
            />
            <div className="feedback-actions">
              <button
                type="button"
                className="link-button"
                onClick={() => void record()}
              >
                {recording ? <MicOff size={14} /> : <Mic size={14} />}{" "}
                {recording ? "Stop recording" : "Dictate feedback"}
              </button>
              <button className="btn small-btn" disabled={!note.trim()}>
                <Send size={13} />
                Save note
              </button>
            </div>
          </form>
          {notes.map((n) => (
            <div className={`review-note ${n.state}`} key={n.id}>
              <span>
                {n.state === "pending" ? (
                  <MessageSquare size={13} />
                ) : (
                  <Check size={13} />
                )}
              </span>
              <div>
                {n.body}
                <small>
                  {n.state === "pending"
                    ? "Awaiting revision"
                    : "Applied to a calculation revision"}
                </small>
              </div>
            </div>
          ))}
          <button className="sample-note" onClick={() => setNote(sample)}>
            Try a supported revision <ArrowRight size={13} />
            <span>{sample}</span>
          </button>
          <div className="revision-action">
            <span>
              <strong>{pending.length} proposed edits</strong>
              <small>
                New analysis versions update linked material figures.
              </small>
            </span>
            <button
              className="btn navy"
              disabled={busy || !pending.length || live}
              onClick={() => void onRevise()}
            >
              <Play size={13} />
              {busy ? "Revising…" : "Apply review & revise"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
