import { afterEach, beforeEach, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const refresh = mock(() => {});
mock.module("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
const { Recorder } = await import("./recorder");

type RecorderEvent = { data: Blob };

const stopAudio = mock(() => {});
const stopVideo = mock(() => {});
const revokeObjectURL = mock((url: string) => { void url; });
const createObjectURL = mock((blob: Blob) => {
  expect(blob.size).toBeGreaterThan(0);
  return "blob:test-recording";
});
let getUserMedia: ReturnType<typeof mock>;
let recorderInstances: FakeMediaRecorder[] = [];
let testStream: MediaStream;

class FakeMediaRecorder {
  static isTypeSupported(type: string) {
    return type.startsWith("video/");
  }

  state: RecordingState = "inactive";
  mimeType = "video/webm";
  ondataavailable: ((event: RecorderEvent) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(stream: MediaStream, options?: MediaRecorderOptions) {
    void stream;
    void options;
    recorderInstances.push(this);
  }

  start(timeslice?: number) {
    void timeslice;
    this.state = "recording";
  }

  stop() {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["video bytes"], { type: this.mimeType }) });
    this.onstop?.();
  }
}

beforeEach(() => {
  refresh.mockClear();
  stopAudio.mockClear();
  stopVideo.mockClear();
  revokeObjectURL.mockClear();
  createObjectURL.mockClear();
  recorderInstances = [];
  const tracks = [
    { stop: stopAudio, addEventListener: () => {} },
    { stop: stopVideo, addEventListener: () => {} },
  ];
  testStream = new MediaStream();
  Object.defineProperty(testStream, "getTracks", { value: () => tracks });
  getUserMedia = mock(async () => testStream);
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia },
  });
  Object.defineProperty(globalThis, "MediaRecorder", {
    configurable: true,
    value: FakeMediaRecorder,
  });
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: createObjectURL,
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: revokeObjectURL,
  });
  Object.defineProperty(HTMLMediaElement.prototype, "play", {
    configurable: true,
    value: () => Promise.resolve(),
  });
});

afterEach(() => {
  cleanup();
});

test("records, previews, and discards a clip", async () => {
  render(<Recorder sessionId="test-session" />);
  fireEvent.click(screen.getByRole("button", { name: "Start recording" }));
  await screen.findByRole("button", { name: "Stop recording" });
  expect(getUserMedia).toHaveBeenCalledTimes(1);
  expect(recorderInstances[0]?.state).toBe("recording");

  fireEvent.click(screen.getByRole("button", { name: "Stop recording" }));
  await screen.findByLabelText("Recorded practice preview");
  expect(stopAudio).toHaveBeenCalledTimes(1);
  expect(stopVideo).toHaveBeenCalledTimes(1);
  expect(createObjectURL).toHaveBeenCalledTimes(1);

  fireEvent.click(screen.getByRole("button", { name: "Discard recording" }));
  expect(revokeObjectURL).toHaveBeenCalledWith("blob:test-recording");
  expect(screen.getByRole("button", { name: "Start recording" })).toBeTruthy();
});

test("record again releases the old preview and requests new devices", async () => {
  render(<Recorder sessionId="test-session" />);
  fireEvent.click(screen.getByRole("button", { name: "Start recording" }));
  await screen.findByRole("button", { name: "Stop recording" });
  fireEvent.click(screen.getByRole("button", { name: "Stop recording" }));
  await screen.findByRole("button", { name: "Record again" });

  fireEvent.click(screen.getByRole("button", { name: "Record again" }));
  await screen.findByRole("button", { name: "Stop recording" });
  expect(getUserMedia).toHaveBeenCalledTimes(2);
  expect(revokeObjectURL).toHaveBeenCalledWith("blob:test-recording");
});

test("permission denial leaves a useful retry path", async () => {
  getUserMedia.mockImplementationOnce(async () => {
    throw new DOMException("denied", "NotAllowedError");
  });
  render(<Recorder sessionId="test-session" />);
  fireEvent.click(screen.getByRole("button", { name: "Start recording" }));
  const alert = await screen.findByRole("alert");
  expect(alert.textContent).toContain("access was denied");
  expect(screen.getByRole("button", { name: "Start recording" })).toBeTruthy();
});

test("leaving during capture stops devices without keeping a clip", async () => {
  const page = render(<Recorder sessionId="test-session" />);
  fireEvent.click(screen.getByRole("button", { name: "Start recording" }));
  await screen.findByRole("button", { name: "Stop recording" });
  page.unmount();
  expect(stopAudio).toHaveBeenCalledTimes(1);
  expect(stopVideo).toHaveBeenCalledTimes(1);
  expect(createObjectURL).not.toHaveBeenCalled();
});

test("permission arriving after leaving still releases the devices", async () => {
  let allowDevices!: (stream: MediaStream) => void;
  getUserMedia.mockImplementationOnce(
    () => new Promise<MediaStream>((resolve) => { allowDevices = resolve; }),
  );
  const page = render(<Recorder sessionId="test-session" />);
  fireEvent.click(screen.getByRole("button", { name: "Start recording" }));
  expect(screen.getByText("Waiting for permission")).toBeTruthy();
  page.unmount();
  allowDevices(testStream);
  await Promise.resolve();
  expect(stopAudio).toHaveBeenCalledTimes(1);
  expect(stopVideo).toHaveBeenCalledTimes(1);
});

test("cancelling an unanswered permission request keeps a retry path", async () => {
  let allowDevices!: (stream: MediaStream) => void;
  getUserMedia.mockImplementationOnce(
    () => new Promise<MediaStream>((resolve) => { allowDevices = resolve; }),
  );
  render(<Recorder sessionId="test-session" />);
  fireEvent.click(screen.getByRole("button", { name: "Start recording" }));
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.getByRole("button", { name: "Start recording" })).toBeTruthy();
  allowDevices(testStream);
  await Promise.resolve();
  expect(stopAudio).toHaveBeenCalledTimes(1);
  expect(stopVideo).toHaveBeenCalledTimes(1);
});

test("unsupported browsers show a clear message", () => {
  Object.defineProperty(globalThis, "MediaRecorder", {
    configurable: true,
    value: undefined,
  });
  render(<Recorder sessionId="test-session" />);
  fireEvent.click(screen.getByRole("button", { name: "Start recording" }));
  expect(screen.getByRole("alert").textContent).toContain("This browser cannot record");
});

test("saves directly to a signed URL and completes the session", async () => {
  const fetchMock = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith("/upload-url")) {
      expect(init?.method).toBe("POST");
      expect(JSON.parse(String(init?.body))).toMatchObject({
        content_type: "video/webm",
        size_bytes: 11,
      });
      return Response.json({
        upload_url: "http://storage.test/signed-object",
        headers: { "Content-Type": "video/webm" },
      });
    }
    if (url === "http://storage.test/signed-object") {
      expect(init?.method).toBe("PUT");
      expect(init?.body).toBeInstanceOf(Blob);
      expect(init?.credentials).toBe("omit");
      return new Response(null, { status: 200 });
    }
    expect(url).toEndWith("/complete-upload");
    return Response.json({ status: "uploaded" });
  });
  const previousFetch = globalThis.fetch;
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  try {
    render(<Recorder sessionId="test-session" />);
    fireEvent.click(screen.getByRole("button", { name: "Start recording" }));
    await screen.findByRole("button", { name: "Stop recording" });
    fireEvent.click(screen.getByRole("button", { name: "Stop recording" }));
    fireEvent.click(await screen.findByRole("button", { name: "Save recording" }));
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(screen.getByText("Recording saved privately to your session.")).toBeTruthy();
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("a failed upload retains the clip for retry", async () => {
  const previousFetch = globalThis.fetch;
  const fetchMock = mock(async (input: RequestInfo | URL) => {
    if (String(input).endsWith("/upload-url")) {
      return Response.json({
        upload_url: "http://storage.test/signed-object",
        headers: { "Content-Type": "video/webm" },
      });
    }
    return new Response(null, { status: 503 });
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  try {
    render(<Recorder sessionId="test-session" />);
    fireEvent.click(screen.getByRole("button", { name: "Start recording" }));
    await screen.findByRole("button", { name: "Stop recording" });
    fireEvent.click(screen.getByRole("button", { name: "Stop recording" }));
    fireEvent.click(await screen.findByRole("button", { name: "Save recording" }));
    await screen.findByRole("alert");
    expect(screen.getByLabelText("Recorded practice preview")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Save recording" })).toBeTruthy();
    expect(refresh).not.toHaveBeenCalled();
  } finally {
    globalThis.fetch = previousFetch;
  }
});
