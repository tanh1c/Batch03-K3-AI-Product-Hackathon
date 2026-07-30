import * as pdfjsLib from "/vendor/pdf.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/vendor/pdf.worker.mjs";

const DEMO_PAGES = [
  {
    title: "AI & LLM Foundation",
    text: "AI trong hành động — Nền tảng về trí tuệ nhân tạo và mô hình ngôn ngữ lớn. AI là khả năng hệ thống thực hiện các nhiệm vụ thường cần trí tuệ con người. LLM học các quy luật trong dữ liệu ngôn ngữ để dự đoán và sinh nội dung.",
    layout: "cover",
  },
  {
    title: "Một mô hình, nhiều năng lực",
    text: "Mô hình ngôn ngữ lớn có thể tóm tắt, phân loại, trích xuất thông tin và tạo nội dung. Kết quả tốt phụ thuộc vào ngữ cảnh, yêu cầu rõ ràng và cách con người kiểm tra đầu ra.",
    layout: "orbit",
  },
  {
    title: "Ba nhóm hệ thống AI",
    text: "AI phân loại đưa ra nhãn hoặc dự đoán. AI sinh nội dung tạo văn bản, hình ảnh hoặc âm thanh mới. AI hành động lập kế hoạch và sử dụng công cụ để hoàn thành mục tiêu.",
    layout: "cards",
  },
  {
    title: "LLM vận hành như thế nào?",
    text: "Văn bản được tách thành token. Transformer xử lý quan hệ giữa các token và tạo phân bố xác suất cho token tiếp theo. Quá trình dự đoán lặp lại tạo thành câu trả lời hoàn chỉnh.",
    layout: "timeline",
  },
  {
    title: "Con người vẫn ở trung tâm",
    text: "AI có thể tạo câu trả lời trôi chảy nhưng vẫn có thể sai hoặc thiếu căn cứ. Người học cần kiểm tra nguồn, so sánh với tài liệu gốc và phản hồi khi hệ thống không chắc chắn.",
    layout: "closing",
  },
];

const ICONS = {
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  x: '<path d="m6 6 12 12M18 6 6 18"/>',
  "book-open": '<path d="M3 5.5c3.6-1.4 6.5-.6 9 1.5v13c-2.5-2.1-5.4-2.9-9-1.5zM21 5.5c-3.6-1.4-6.5-.6-9 1.5v13c2.5-2.1 5.4-2.9 9-1.5z"/>',
  upload: '<path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14v5h14v-5"/>',
  moon: '<path d="M20 15.2A8 8 0 1 1 8.8 4 6.3 6.3 0 0 0 20 15.2Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  cursor: '<path d="m5 3 13 8-6 2-3 6z"/>',
  pen: '<path d="m4 20 4.2-1 10.6-10.6a2 2 0 0 0-2.8-2.8L5.4 16.2zM14.5 7.1l2.8 2.8"/>',
  highlighter: '<path d="m4 17 7-11 6 4-7 11M3 21h18M9.5 18.5l-4-2.5"/>',
  circle: '<circle cx="12" cy="12" r="7.5"/>',
  type: '<path d="M5 5h14M12 5v14M8.5 19h7"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m5 17 4.5-4.5 3 3 2-2L19 17"/>',
  eraser: '<path d="m4.5 14.5 8.7-8.7a2.4 2.4 0 0 1 3.4 0l2.1 2.1a2.4 2.4 0 0 1 0 3.4l-7.2 7.2H7.2zM10 19h10M9.5 9.5l5 5"/>',
  more: '<circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  undo: '<path d="M9 7 4 12l5 5M5 12h8a6 6 0 0 1 6 6"/>',
  trash: '<path d="M4 7h16M9 3h6l1 4M7 7l1 14h8l1-14M10 11v6M14 11v6"/>',
  "chevron-left": '<path d="m15 18-6-6 6-6"/>',
  "chevron-right": '<path d="m9 18 6-6-6-6"/>',
  "chevron-down": '<path d="m6 9 6 6 6-6"/>',
  bot: '<rect x="4" y="7" width="16" height="12" rx="3"/><path d="M9 12h.01M15 12h.01M9 16h6M12 7V4M10 4h4"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 8-8M16 7l2 2M14 9l2 2"/>',
  send: '<path d="m3 11 18-8-8 18-2-8zM11 13l5-5"/>',
  alert: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>',
  note: '<path d="M5 3h14v14l-4 4H5zM15 21v-4h4M8 8h8M8 12h6"/>',
  file: '<path d="M6 2h8l4 4v16H6zM14 2v5h5M9 12h6M9 16h6"/>',
  shield: '<path d="M12 3 4.5 6v5.5c0 4.7 3 8 7.5 9.5 4.5-1.5 7.5-4.8 7.5-9.5V6zM9 12l2 2 4-4"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/>',
  play: '<circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4z"/>',
};

const STORAGE_KEY = "vlearn-reader-state-v1";
const stored = readStoredState();
const todayKey = new Date().toISOString().slice(0, 10);
const state = {
  document: { id: "demo-foundation", name: "AI trong hành động.pdf", type: "demo" },
  uploadedDocuments: [],
  pdfDocument: null,
  pdfPages: [],
  pageTexts: DEMO_PAGES.map((page) => page.text),
  currentPage: 1,
  totalPages: DEMO_PAGES.length,
  zoom: stored.zoom || 0.9,
  mode: "read",
  drawColor: stored.drawColor || "#f5a11a",
  drawWidth: stored.drawWidth || 0.004,
  annotations: stored.annotations || {},
  notes: stored.notes || {},
  leftOpen: window.innerWidth > 850,
  tutorOpen: false,
  theme: stored.theme || "light",
  selectionText: "",
  selectionPage: 1,
  noteDraftPage: 1,
  chat: [],
  questionCount: stored.questionDate === todayKey ? (stored.questionCount || 0) : 0,
  aiConfigured: false,
  aiModel: null,
  sending: false,
  renderObserver: null,
  renderTasks: new Map(),
  scrollFrame: null,
  activeHighlight: null,
  activeRegion: null,
  highlightSaveTimer: null,
};

const elements = {
  app: document.querySelector("#app"),
  workspace: document.querySelector(".workspace"),
  documentTitle: document.querySelector("#documentTitle"),
  documentSubtitle: document.querySelector("#documentSubtitle"),
  libraryPanel: document.querySelector("#libraryPanel"),
  libraryList: document.querySelector("#libraryList"),
  readerArea: document.querySelector("#readerArea"),
  readerScroll: document.querySelector("#readerScroll"),
  pagesHost: document.querySelector("#pagesHost"),
  loadingState: document.querySelector("#loadingState"),
  loadingDetail: document.querySelector("#loadingDetail"),
  tutorPanel: document.querySelector("#tutorPanel"),
  currentPageLabel: document.querySelector("#currentPageLabel"),
  totalPagesLabel: document.querySelector("#totalPagesLabel"),
  zoomLabel: document.querySelector("#zoomLabel"),
  pageNotePill: document.querySelector("#pageNotePill"),
  composerPage: document.querySelector("#composerPage"),
  selectionMenu: document.querySelector("#selectionMenu"),
  moreToolsButton: document.querySelector("#moreToolsButton"),
  moreToolsPanel: document.querySelector("#moreToolsPanel"),
  drawingOptions: document.querySelector("#drawingOptions"),
  strokeWidthInput: document.querySelector("#strokeWidthInput"),
  highlightPopover: document.querySelector("#highlightPopover"),
  highlightSelectedText: document.querySelector("#highlightSelectedText"),
  highlightNoteInput: document.querySelector("#highlightNoteInput"),
  regionPopover: document.querySelector("#regionPopover"),
  regionTitle: document.querySelector("#regionTitle"),
  uploadModal: document.querySelector("#uploadModal"),
  noteModal: document.querySelector("#noteModal"),
  notesListModal: document.querySelector("#notesListModal"),
  noteInput: document.querySelector("#noteInput"),
  notePageLabel: document.querySelector("#notePageLabel"),
  notesList: document.querySelector("#notesList"),
  notesListPage: document.querySelector("#notesListPage"),
  fileInput: document.querySelector("#fileInput"),
  dropZone: document.querySelector("#dropZone"),
  chatMessages: document.querySelector("#chatMessages"),
  chatForm: document.querySelector("#chatForm"),
  chatInput: document.querySelector("#chatInput"),
  sendButton: document.querySelector("#sendButton"),
  quotaLabel: document.querySelector("#quotaLabel"),
  quotaProgress: document.querySelector("#quotaProgress"),
  aiModeLabel: document.querySelector("#aiModeLabel"),
  themeButton: document.querySelector("#themeButton"),
  toastStack: document.querySelector("#toastStack"),
};

initialize();

function initialize() {
  renderIcons(document);
  applyTheme();
  bindEvents();
  renderLibrary();
  renderDemoDocument();
  addWelcomeMessage();
  updateWorkspace();
  updateChrome();
  checkApiHealth();
}

function bindEvents() {
  document.querySelector("#openUploadButton").addEventListener("click", () => openModal("uploadModal"));
  document.querySelector("#libraryUploadButton").addEventListener("click", () => openModal("uploadModal"));
  document.querySelector("#mobileMenuButton").addEventListener("click", () => { state.leftOpen = true; updateWorkspace(); });
  document.querySelector("#closeLibraryButton").addEventListener("click", () => { state.leftOpen = false; updateWorkspace(); });
  document.querySelector("#libraryToggle").addEventListener("click", () => { state.leftOpen = !state.leftOpen; updateWorkspace(); });
  document.querySelector("#tutorToggle").addEventListener("click", () => { state.tutorOpen = !state.tutorOpen; updateWorkspace(); });
  document.querySelector("#closeTutorButton").addEventListener("click", () => { state.tutorOpen = false; updateWorkspace(); });
  document.querySelector("#newChatButton").addEventListener("click", resetChat);
  document.querySelector("#previousPageButton").addEventListener("click", () => scrollToPage(state.currentPage - 1));
  document.querySelector("#nextPageButton").addEventListener("click", () => scrollToPage(state.currentPage + 1));
  document.querySelector("#zoomOutButton").addEventListener("click", () => setZoom(state.zoom - 0.1));
  document.querySelector("#zoomInButton").addEventListener("click", () => setZoom(state.zoom + 0.1));
  document.querySelector("#addNoteButton").addEventListener("click", () => openNoteModal(state.currentPage));
  document.querySelector("#pageNotePill").addEventListener("click", () => openNotesList(state.currentPage));
  document.querySelector("#undoButton").addEventListener("click", undoAnnotation);
  document.querySelector("#clearButton").addEventListener("click", clearPageAnnotations);
  elements.moreToolsButton.addEventListener("click", toggleMoreToolsPanel);
  document.querySelector("#saveNoteButton").addEventListener("click", saveNote);
  document.querySelector("#aiStatusButton").addEventListener("click", () => showToast(state.aiConfigured ? `Tutor đang dùng ${state.aiModel}.` : "Tutor đang ở chế độ demo. Thêm OPENAI_API_KEY vào môi trường server để bật AI thật."));

  document.querySelectorAll("[data-mode]").forEach((button) => button.addEventListener("click", () => setMode(button.dataset.mode)));
  document.querySelectorAll("[data-tool-action]").forEach((button) => button.addEventListener("click", () => {
    showToast(button.dataset.toolAction === "text" ? "Công cụ Text sẽ được bổ sung ở bản tiếp theo." : "Công cụ chèn ảnh sẽ được bổ sung ở bản tiếp theo.");
  }));
  document.querySelectorAll("[data-draw-color]").forEach((button) => button.addEventListener("click", () => setDrawColor(button.dataset.drawColor)));
  elements.strokeWidthInput.addEventListener("input", () => {
    state.drawWidth = Number(elements.strokeWidthInput.value) / 1000;
    persistState();
  });
  document.querySelectorAll("[data-close-modal]").forEach((button) => button.addEventListener("click", () => closeModal(button.dataset.closeModal)));
  document.querySelectorAll(".modal-backdrop").forEach((modal) => modal.addEventListener("mousedown", (event) => {
    if (event.target === modal) closeModal(modal.id);
  }));

  elements.themeButton.addEventListener("click", toggleTheme);
  elements.fileInput.addEventListener("change", (event) => handleFile(event.target.files?.[0]));
  ["dragenter", "dragover"].forEach((name) => elements.dropZone.addEventListener(name, (event) => { event.preventDefault(); elements.dropZone.classList.add("dragging"); }));
  ["dragleave", "drop"].forEach((name) => elements.dropZone.addEventListener(name, (event) => { event.preventDefault(); elements.dropZone.classList.remove("dragging"); }));
  elements.dropZone.addEventListener("drop", (event) => handleFile(event.dataTransfer?.files?.[0]));

  elements.readerScroll.addEventListener("scroll", () => {
    if (state.scrollFrame) return;
    state.scrollFrame = requestAnimationFrame(() => { state.scrollFrame = null; updateCurrentPageFromScroll(); });
  }, { passive: true });
  elements.chatForm.addEventListener("submit", sendQuestion);
  elements.chatInput.addEventListener("input", autoGrowComposer);
  elements.chatInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); elements.chatForm.requestSubmit(); }
  });
  elements.selectionMenu.addEventListener("click", handleSelectionAction);
  elements.highlightPopover.addEventListener("click", handleHighlightPopoverAction);
  elements.highlightNoteInput.addEventListener("input", handleHighlightNoteInput);
  elements.regionPopover.addEventListener("click", handleRegionAction);
  document.addEventListener("pointerdown", (event) => {
    if (!elements.selectionMenu.contains(event.target) && !event.target.closest(".page-paper")) hideSelectionMenu();
    if (!elements.highlightPopover.contains(event.target) && !event.target.closest(".annotation-marker")) hideHighlightPopover();
    if (!elements.regionPopover.contains(event.target) && !event.target.closest(".annotation-canvas")) hideRegionPopover();
    if (!elements.moreToolsPanel.contains(event.target) && !event.target.closest("#moreToolsButton") && !event.target.closest(".page-paper")) hideMoreToolsPanel();
  });
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") { hideSelectionMenu(); hideHighlightPopover(); hideRegionPopover(); hideMoreToolsPanel(); document.querySelectorAll(".modal-backdrop:not(.hidden)").forEach((modal) => closeModal(modal.id)); }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && !event.target.matches("textarea,input")) { event.preventDefault(); undoAnnotation(); }
  });

  setDrawColor(state.drawColor, false);
  elements.strokeWidthInput.value = String(Math.round(state.drawWidth * 1000));
}

function renderIcons(root) {
  root.querySelectorAll("[data-icon]").forEach((node) => {
    const path = ICONS[node.dataset.icon];
    if (path) node.innerHTML = `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${path}</svg>`;
  });
}

function icon(name) {
  return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ""}</svg>`;
}

function renderLibrary() {
  const docs = [
    { ...state.document, current: true, pages: state.totalPages },
    ...state.uploadedDocuments.filter((doc) => doc.id !== state.document.id).map((doc) => ({ ...doc, current: false })),
  ];
  if (state.document.id !== "demo-foundation") docs.push({ id: "demo-foundation", name: "AI trong hành động.pdf", type: "demo", pages: DEMO_PAGES.length, current: false });

  elements.libraryList.innerHTML = `
    <section class="chapter-card">
      <button class="chapter-header">
        <span class="chapter-icon">${icon("play")}</span>
        <span><strong>Day 1</strong><small>${docs.length} tài liệu · active</small></span>
        <span class="study-chip">STUDYING</span><span class="chevron">${icon("chevron-down")}</span>
      </button>
      <div class="chapter-docs">
        ${docs.map((doc) => `
          <button class="document-item ${doc.current ? "active" : ""}" data-document-id="${escapeHtml(doc.id)}">
            <span class="doc-state">${icon(doc.current ? "check" : "play")}</span>
            <span><strong>${escapeHtml(doc.name)}</strong><small>${doc.pages || "?"} trang</small></span>
          </button>`).join("")}
      </div>
    </section>
    ${[2, 3, 4, 5].map((day) => `
      <section class="chapter-card collapsed">
        <button class="chapter-header"><span class="chapter-icon">${icon("play")}</span><span><strong>Day ${day}</strong><small>Chưa có tài liệu</small></span><span class="chevron">${icon("chevron-down")}</span></button>
        <div class="chapter-docs"></div>
      </section>`).join("")}`;

  elements.libraryList.querySelectorAll(".chapter-header").forEach((button) => button.addEventListener("click", () => button.closest(".chapter-card").classList.toggle("collapsed")));
  elements.libraryList.querySelectorAll("[data-document-id]").forEach((button) => button.addEventListener("click", () => activateDocument(button.dataset.documentId)));
}

async function activateDocument(id) {
  if (id === state.document.id) return;
  if (id === "demo-foundation") {
    cancelPdfRenders();
    state.document = { id: "demo-foundation", name: "AI trong hành động.pdf", type: "demo" };
    state.pdfDocument = null;
    state.pdfPages = [];
    state.pageTexts = DEMO_PAGES.map((page) => page.text);
    state.totalPages = DEMO_PAGES.length;
    state.currentPage = 1;
    renderDemoDocument();
    renderLibrary();
    updateChrome();
    return;
  }
  const target = state.uploadedDocuments.find((doc) => doc.id === id);
  if (!target?.file) {
    showToast("Trình duyệt không giữ file sau khi tải lại trang. Vui lòng tải PDF lên lại.", "error");
    return;
  }
  await loadPdf(target.file, target);
}

function renderDemoDocument() {
  disconnectRenderObserver();
  elements.pagesHost.innerHTML = "";
  DEMO_PAGES.forEach((page, index) => {
    const shell = createPageShell(index + 1, 1000, 562.5);
    shell.querySelector(".page-paper").insertAdjacentHTML("afterbegin", demoPageMarkup(page, index));
    elements.pagesHost.appendChild(shell);
    setupAnnotationLayer(shell, index + 1);
    wireReadInteractions(shell, index + 1);
  });
  updatePageModes();
  updateCurrentPageClass();
}

function demoPageMarkup(page, index) {
  const common = `<span class="eyebrow">AI IN ACTION · DAY 1</span>`;
  if (page.layout === "cover") return `<div class="demo-slide cover">${common}<h2>${escapeHtml(page.title)}</h2><p>Bạn đang dùng AI mỗi ngày — nhưng thực sự bên trong nó đang làm gì?</p><div class="accent-line"></div><span class="slide-number">${index + 1}</span></div>`;
  if (page.layout === "orbit") return `<div class="demo-slide two-column"><div class="slide-copy">${common}<h2>${escapeHtml(page.title)}</h2><p>${escapeHtml(page.text)}</p></div><div class="diagram-orbit"><div class="core">LLM</div><i>Tóm tắt</i><i>Sáng tạo</i><i>Trích xuất</i><i>Phân loại</i></div><span class="slide-number">${index + 1}</span></div>`;
  if (page.layout === "cards") return `<div class="demo-slide">${common}<h2>${escapeHtml(page.title)}</h2><div class="card-grid"><div class="concept-card"><span class="number">01</span><h3>Phân loại</h3><p>Đưa ra nhãn, điểm số hoặc dự đoán.</p></div><div class="concept-card"><span class="number">02</span><h3>Sinh nội dung</h3><p>Tạo văn bản, hình ảnh hoặc âm thanh.</p></div><div class="concept-card"><span class="number">03</span><h3>Hành động</h3><p>Lập kế hoạch và sử dụng công cụ.</p></div></div><span class="slide-number">${index + 1}</span></div>`;
  if (page.layout === "timeline") return `<div class="demo-slide">${common}<h2>${escapeHtml(page.title)}</h2><p>${escapeHtml(page.text)}</p><div class="timeline"><div class="timeline-step"><b>1</b><span>Token hóa</span></div><div class="timeline-step"><b>2</b><span>Transformer</span></div><div class="timeline-step"><b>3</b><span>Xác suất</span></div><div class="timeline-step"><b>4</b><span>Sinh câu</span></div></div><span class="slide-number">${index + 1}</span></div>`;
  return `<div class="demo-slide two-column"><div class="slide-copy">${common}<h2>${escapeHtml(page.title)}</h2><p>${escapeHtml(page.text)}</p><div class="accent-line"></div></div><div class="diagram-orbit"><div class="core">YOU</div><i>Hỏi</i><i>Kiểm tra</i><i>Phản hồi</i><i>Học</i></div><span class="slide-number">${index + 1}</span></div>`;
}

function createPageShell(pageNumber, baseWidth, baseHeight) {
  const paperWidth = Math.round(baseWidth * state.zoom);
  const paperHeight = Math.round(baseHeight * state.zoom);
  const shell = document.createElement("article");
  shell.className = `page-shell${pageNumber === state.currentPage ? " current" : ""}`;
  shell.dataset.page = String(pageNumber);
  shell.dataset.mode = state.mode;
  shell.style.width = `${paperWidth + 42}px`;
  shell.style.height = `${paperHeight + 60}px`;
  shell.innerHTML = `
    <div class="page-meta"><span>Trang ${pageNumber} / ${state.totalPages}</span><span>${escapeHtml(state.document.name)}</span></div>
    <div class="page-paper" style="width:${paperWidth}px;height:${paperHeight}px">
      <canvas class="annotation-canvas"></canvas><div class="annotation-markers"></div><div class="page-note-markers"></div>
    </div>`;
  return shell;
}

async function handleFile(file) {
  if (!file) return;
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) return showToast("Vui lòng chọn một file PDF.", "error");
  if (file.size > 50 * 1024 * 1024) return showToast("File vượt quá giới hạn 50 MB.", "error");
  const id = `pdf-${file.name}-${file.size}-${file.lastModified}`;
  let doc = state.uploadedDocuments.find((item) => item.id === id);
  if (!doc) {
    doc = { id, name: file.name, type: "pdf", file, pages: "?" };
    state.uploadedDocuments.unshift(doc);
  } else doc.file = file;
  closeModal("uploadModal");
  elements.fileInput.value = "";
  await loadPdf(file, doc);
}

async function loadPdf(file, docMeta) {
  cancelPdfRenders();
  showLoading(true, "Đang mở PDF…");
  try {
    const data = new Uint8Array(await file.arrayBuffer());
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdf = await loadingTask.promise;
    state.document = docMeta;
    state.pdfDocument = pdf;
    state.pdfPages = [];
    state.pageTexts = [];
    state.totalPages = pdf.numPages;
    state.currentPage = 1;
    docMeta.pages = pdf.numPages;
    elements.pagesHost.innerHTML = "";
    elements.loadingDetail.textContent = `Đang đọc 0 / ${pdf.numPages} trang`;

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1 });
      let text = "";
      let textContent = null;
      try {
        textContent = await page.getTextContent();
        text = textContent.items.map((item) => item.str).join(" ").replace(/\s+/g, " ").trim();
      } catch { text = ""; }
      state.pdfPages.push({ page, baseWidth: viewport.width, baseHeight: viewport.height, textContent, renderedZoom: 0, textLayerTask: null });
      state.pageTexts.push(text);
      const normalizedWidth = 1000;
      const normalizedHeight = normalizedWidth * (viewport.height / viewport.width);
      const shell = createPageShell(pageNumber, normalizedWidth, normalizedHeight);
      shell.querySelector(".page-paper").insertAdjacentHTML("afterbegin", `<div class="pdf-skeleton">Trang ${pageNumber}</div><canvas class="pdf-canvas"></canvas><div class="pdf-text-layer"></div>`);
      elements.pagesHost.appendChild(shell);
      setupAnnotationLayer(shell, pageNumber);
      wireReadInteractions(shell, pageNumber);
      elements.loadingDetail.textContent = `Đang đọc ${pageNumber} / ${pdf.numPages} trang`;
      if (pageNumber % 8 === 0) await new Promise((resolve) => requestAnimationFrame(resolve));
    }

    setupLazyPdfRendering();
    updatePageModes();
    updateChrome();
    renderLibrary();
    resetChat();
    showToast(`Đã mở ${file.name} · ${pdf.numPages} trang`, "success");
  } catch (error) {
    console.error(error);
    showToast("Không thể đọc PDF này. File có thể bị mã hóa hoặc không hợp lệ.", "error");
    if (!state.pdfDocument) renderDemoDocument();
  } finally {
    showLoading(false);
  }
}

function setupLazyPdfRendering() {
  disconnectRenderObserver();
  state.renderObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => { if (entry.isIntersecting) renderPdfPage(Number(entry.target.dataset.page)); });
  }, { root: elements.readerScroll, rootMargin: "900px 0px", threshold: 0.01 });
  elements.pagesHost.querySelectorAll(".page-shell").forEach((shell) => state.renderObserver.observe(shell));
}

async function renderPdfPage(pageNumber) {
  const pageState = state.pdfPages[pageNumber - 1];
  const shell = getPageShell(pageNumber);
  if (!pageState || !shell || pageState.renderedZoom === state.zoom) return;
  const canvas = shell.querySelector(".pdf-canvas");
  const skeleton = shell.querySelector(".pdf-skeleton");
  if (!canvas) return;
  const cssWidth = 1000 * state.zoom;
  const scale = cssWidth / pageState.baseWidth;
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const viewport = pageState.page.getViewport({ scale: scale * pixelRatio });
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  canvas.style.width = `${Math.round(viewport.width / pixelRatio)}px`;
  canvas.style.height = `${Math.round(viewport.height / pixelRatio)}px`;
  const previous = state.renderTasks.get(pageNumber);
  if (previous) { try { previous.cancel(); } catch { /* no-op */ } }
  const task = pageState.page.render({ canvasContext: canvas.getContext("2d"), viewport });
  state.renderTasks.set(pageNumber, task);
  try {
    await task.promise;
    if (pageState === state.pdfPages[pageNumber - 1]) {
      pageState.renderedZoom = state.zoom;
      skeleton?.remove();
      await renderPdfTextLayer(pageState, shell, scale);
    }
  } catch (error) {
    if (error?.name !== "RenderingCancelledException") console.error(error);
  } finally {
    if (state.renderTasks.get(pageNumber) === task) state.renderTasks.delete(pageNumber);
  }
}

async function renderPdfTextLayer(pageState, shell, scale) {
  const container = shell.querySelector(".pdf-text-layer");
  if (!container || !pageState.textContent) return;
  try { pageState.textLayerTask?.cancel(); } catch { /* no-op */ }
  container.innerHTML = "";
  const viewport = pageState.page.getViewport({ scale });
  const task = new pdfjsLib.TextLayer({ textContentSource: pageState.textContent, container, viewport });
  pageState.textLayerTask = task;
  try { await task.render(); } catch (error) {
    if (error?.name !== "AbortException") console.error(error);
  } finally {
    if (pageState.textLayerTask === task) pageState.textLayerTask = null;
  }
}

function cancelPdfRenders() {
  state.renderTasks.forEach((task) => { try { task.cancel(); } catch { /* no-op */ } });
  state.renderTasks.clear();
  state.pdfPages.forEach((pageState) => { try { pageState.textLayerTask?.cancel(); } catch { /* no-op */ } pageState.textLayerTask = null; });
  disconnectRenderObserver();
}

function disconnectRenderObserver() {
  state.renderObserver?.disconnect();
  state.renderObserver = null;
}

function setMode(mode) {
  state.mode = mode;
  document.querySelectorAll("[data-mode]").forEach((button) => button.classList.toggle("active", button.dataset.mode === mode));
  elements.moreToolsButton.classList.toggle("active", mode === "circle" || mode === "eraser");
  elements.drawingOptions.classList.toggle("hidden", mode !== "circle");
  if (mode === "read" || mode === "pen" || mode === "highlight") hideMoreToolsPanel();
  hideSelectionMenu();
  hideHighlightPopover();
  hideRegionPopover();
  window.getSelection()?.removeAllRanges();
  updatePageModes();
  const messages = {
    read: "Chế độ đọc: bôi đen chữ hoặc nhấp chuột phải để mở menu ngữ cảnh.",
    pen: "Giữ và kéo chuột để viết lên slide.",
    highlight: "Kéo qua chữ để bôi highlight theo từng dòng.",
    circle: "Khoanh vùng nội dung đang khiến bạn gặp vấn đề.",
    eraser: "Nhấn vào đúng nét vẽ hoặc highlight muốn tẩy.",
  };
  showToast(messages[mode]);
}

function toggleMoreToolsPanel() {
  const willOpen = elements.moreToolsPanel.classList.contains("hidden");
  elements.moreToolsPanel.classList.toggle("hidden", !willOpen);
  elements.moreToolsButton.setAttribute("aria-expanded", String(willOpen));
  elements.drawingOptions.classList.toggle("hidden", state.mode !== "circle");
}

function hideMoreToolsPanel() {
  elements.moreToolsPanel.classList.add("hidden");
  elements.moreToolsButton.setAttribute("aria-expanded", "false");
}

function setDrawColor(color, save = true) {
  state.drawColor = color;
  document.querySelectorAll("[data-draw-color]").forEach((button) => button.classList.toggle("active", button.dataset.drawColor === color));
  if (save) persistState();
}

function updatePageModes() {
  elements.pagesHost.querySelectorAll(".page-shell").forEach((shell) => { shell.dataset.mode = state.mode; });
}

function setupAnnotationLayer(shell, pageNumber) {
  const canvas = shell.querySelector(".annotation-canvas");
  resizeAnnotationCanvas(canvas);
  drawAnnotations(pageNumber);
  renderAnnotationMarkers(pageNumber);
  renderNoteMarkers(pageNumber);
  let drawing = null;

  canvas.addEventListener("pointerdown", (event) => {
    if (state.mode === "read" || state.mode === "highlight") return;
    event.preventDefault();
    const point = normalizedPoint(event, canvas);
    if (state.mode === "eraser") {
      eraseAnnotationAtPoint(pageNumber, point, canvas);
      return;
    }
    if (state.mode !== "pen" && state.mode !== "circle") return;
    canvas.setPointerCapture(event.pointerId);
    drawing = {
      id: createAnnotationId(),
      kind: state.mode,
      points: [point],
      color: state.mode === "circle" ? state.drawColor : "#075591",
      width: state.mode === "circle" ? state.drawWidth : 0.0035,
      createdAt: Date.now(),
    };
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!drawing) return;
    drawing.points.push(normalizedPoint(event, canvas));
    drawAnnotations(pageNumber, drawing);
  });
  canvas.addEventListener("pointerup", (event) => {
    if (!drawing) return;
    drawing.points.push(normalizedPoint(event, canvas));
    const completed = drawing;
    const valid = completed.points.length > 2;
    if (valid) getAnnotations(pageNumber).push(completed);
    drawing = null;
    persistState();
    drawAnnotations(pageNumber);
    renderAnnotationMarkers(pageNumber);
    updateChrome();
    if (valid && completed.kind === "circle") showRegionPopover(pageNumber, completed);
  });
  canvas.addEventListener("pointercancel", () => { drawing = null; drawAnnotations(pageNumber); });
}

function resizeAnnotationCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.round(rect.width * ratio));
  canvas.height = Math.max(1, Math.round(rect.height * ratio));
}

function normalizedPoint(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  return { x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) };
}

function drawAnnotations(pageNumber, preview = null) {
  const canvas = getPageShell(pageNumber)?.querySelector(".annotation-canvas");
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  if (canvas.width !== Math.round(rect.width * ratio) || canvas.height !== Math.round(rect.height * ratio)) resizeAnnotationCanvas(canvas);
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  [...getAnnotations(pageNumber), ...(preview ? [preview] : [])].forEach((annotation) => {
    if (annotation.kind === "highlight") {
      const x = Math.min(annotation.start.x, annotation.end.x) * canvas.width;
      const y = Math.min(annotation.start.y, annotation.end.y) * canvas.height;
      const width = Math.abs(annotation.end.x - annotation.start.x) * canvas.width;
      const height = Math.abs(annotation.end.y - annotation.start.y) * canvas.height;
      context.fillStyle = "rgba(255, 217, 40, .38)";
      context.fillRect(x, y, width, height);
    } else if (annotation.kind === "text-highlight" && annotation.rects?.length) {
      context.fillStyle = "rgba(255, 214, 41, .52)";
      annotation.rects.forEach((highlightRect) => {
        context.fillRect(highlightRect.x * canvas.width, highlightRect.y * canvas.height, highlightRect.width * canvas.width, highlightRect.height * canvas.height);
      });
    } else if ((annotation.kind === "pen" || annotation.kind === "circle") && annotation.points?.length > 1) {
      context.beginPath();
      annotation.points.forEach((point, index) => {
        const x = point.x * canvas.width; const y = point.y * canvas.height;
        if (!index) context.moveTo(x, y); else context.lineTo(x, y);
      });
      context.strokeStyle = annotation.color || "#075591";
      context.lineWidth = Math.max(2, annotation.width * canvas.width);
      context.lineCap = "round"; context.lineJoin = "round"; context.stroke();
    }
  });
}

function createAnnotationId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function ensureAnnotationId(annotation) {
  annotation.id ||= createAnnotationId();
  return annotation.id;
}

function renderAnnotationMarkers(pageNumber) {
  const holder = getPageShell(pageNumber)?.querySelector(".annotation-markers");
  if (!holder) return;
  const highlights = getAnnotations(pageNumber).filter((annotation) => annotation.kind === "text-highlight" && annotation.rects?.length);
  holder.innerHTML = highlights.map((annotation) => {
    const rect = annotation.rects.at(-1);
    const id = ensureAnnotationId(annotation);
    const left = Math.min(97, (rect.x + rect.width) * 100 + 1.2);
    const top = Math.max(1, rect.y * 100 - 1);
    return `<button class="annotation-marker" style="left:${left}%;top:${top}%" data-highlight-id="${escapeHtml(id)}" aria-label="Mở ghi chú highlight">${icon("note")}</button>`;
  }).join("");
  holder.querySelectorAll("[data-highlight-id]").forEach((button) => button.addEventListener("click", (event) => {
    event.stopPropagation();
    const bounds = button.getBoundingClientRect();
    showHighlightPopover(pageNumber, button.dataset.highlightId, bounds.left, bounds.bottom + 8);
  }));
}

function eraseAnnotationAtPoint(pageNumber, point, canvas) {
  const annotations = getAnnotations(pageNumber);
  let matchIndex = -1;
  for (let index = annotations.length - 1; index >= 0; index -= 1) {
    if (annotationContainsPoint(annotations[index], point, canvas)) { matchIndex = index; break; }
  }
  if (matchIndex < 0) return showToast("Không có nét vẽ hoặc highlight tại vị trí này.");
  const [removed] = annotations.splice(matchIndex, 1);
  if (state.activeHighlight?.id === removed.id) hideHighlightPopover();
  if (state.activeRegion?.id === removed.id) hideRegionPopover();
  persistState();
  drawAnnotations(pageNumber);
  renderAnnotationMarkers(pageNumber);
  updateChrome();
  showToast("Đã tẩy đúng chú thích được chọn.", "success");
}

function annotationContainsPoint(annotation, point, canvas) {
  const toleranceX = 10 / Math.max(1, canvas.clientWidth);
  const toleranceY = 10 / Math.max(1, canvas.clientHeight);
  if (annotation.kind === "text-highlight") {
    return annotation.rects?.some((rect) => point.x >= rect.x - toleranceX && point.x <= rect.x + rect.width + toleranceX && point.y >= rect.y - toleranceY && point.y <= rect.y + rect.height + toleranceY);
  }
  if (annotation.kind === "highlight" && annotation.start && annotation.end) {
    const left = Math.min(annotation.start.x, annotation.end.x);
    const right = Math.max(annotation.start.x, annotation.end.x);
    const top = Math.min(annotation.start.y, annotation.end.y);
    const bottom = Math.max(annotation.start.y, annotation.end.y);
    return point.x >= left - toleranceX && point.x <= right + toleranceX && point.y >= top - toleranceY && point.y <= bottom + toleranceY;
  }
  if (!annotation.points?.length) return false;
  const target = { x: point.x * canvas.clientWidth, y: point.y * canvas.clientHeight };
  const tolerance = Math.max(8, (annotation.width || 0.0035) * canvas.clientWidth * 1.8);
  for (let index = 1; index < annotation.points.length; index += 1) {
    const start = { x: annotation.points[index - 1].x * canvas.clientWidth, y: annotation.points[index - 1].y * canvas.clientHeight };
    const end = { x: annotation.points[index].x * canvas.clientWidth, y: annotation.points[index].y * canvas.clientHeight };
    if (distanceToSegment(target, start, end) <= tolerance) return true;
  }
  return false;
}

function distanceToSegment(point, start, end) {
  const dx = end.x - start.x; const dy = end.y - start.y;
  if (!dx && !dy) return Math.hypot(point.x - start.x, point.y - start.y);
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy));
}

function getAnnotations(pageNumber) {
  const key = state.document.id;
  state.annotations[key] ||= {};
  state.annotations[key][pageNumber] ||= [];
  return state.annotations[key][pageNumber];
}

function getNotes(pageNumber) {
  const key = state.document.id;
  state.notes[key] ||= {};
  state.notes[key][pageNumber] ||= [];
  return state.notes[key][pageNumber];
}

function undoAnnotation() {
  const annotations = getAnnotations(state.currentPage);
  if (!annotations.length) return showToast("Trang này chưa có nét vẽ hoặc highlight để hoàn tác.");
  annotations.pop(); hideHighlightPopover(); hideRegionPopover(); persistState(); drawAnnotations(state.currentPage); renderAnnotationMarkers(state.currentPage); updateChrome(); showToast("Đã hoàn tác.", "success");
}

function clearPageAnnotations() {
  const annotations = getAnnotations(state.currentPage);
  if (!annotations.length) return showToast("Trang này chưa có chú thích hình vẽ.");
  if (!window.confirm(`Xóa toàn bộ nét vẽ và highlight ở trang ${state.currentPage}?`)) return;
  annotations.splice(0); hideHighlightPopover(); hideRegionPopover(); persistState(); drawAnnotations(state.currentPage); renderAnnotationMarkers(state.currentPage); updateChrome(); showToast("Đã xóa chú thích trên trang.", "success");
}

function wireReadInteractions(shell, pageNumber) {
  const paper = shell.querySelector(".page-paper");
  paper.addEventListener("contextmenu", (event) => {
    if (state.mode !== "read") return;
    event.preventDefault();
    state.selectionText = window.getSelection()?.toString().trim() || "";
    state.selectionPage = pageNumber;
    showSelectionMenu(event.clientX, event.clientY);
  });
  paper.addEventListener("mouseup", (event) => {
    if (event.button === 2) return;
    if (state.mode === "highlight") {
      createTextHighlightFromSelection(paper, pageNumber);
      return;
    }
    if (state.mode !== "read") return;
    const text = window.getSelection()?.toString().trim() || "";
    if (text.length >= 3) {
      state.selectionText = text.slice(0, 800);
      state.selectionPage = pageNumber;
      showSelectionMenu(event.clientX, event.clientY - 48);
    }
  });
}

function createTextHighlightFromSelection(paper, pageNumber) {
  const selection = window.getSelection();
  if (!selection?.rangeCount || selection.isCollapsed) return;
  const range = selection.getRangeAt(0);
  const commonNode = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE ? range.commonAncestorContainer : range.commonAncestorContainer.parentElement;
  if (!commonNode || !paper.contains(commonNode)) return;
  const text = selection.toString().replace(/\s+/g, " ").trim().slice(0, 800);
  if (text.length < 2) return;
  const paperBounds = paper.getBoundingClientRect();
  const clientRects = [...range.getClientRects()].filter((rect) => rect.width > 1 && rect.height > 1 && rect.right > paperBounds.left && rect.left < paperBounds.right && rect.bottom > paperBounds.top && rect.top < paperBounds.bottom);
  if (!clientRects.length) return;
  const rects = clientRects.map((rect) => {
    const left = Math.max(rect.left, paperBounds.left);
    const top = Math.max(rect.top, paperBounds.top);
    const right = Math.min(rect.right, paperBounds.right);
    const bottom = Math.min(rect.bottom, paperBounds.bottom);
    return {
      x: (left - paperBounds.left) / paperBounds.width,
      y: (top - paperBounds.top) / paperBounds.height,
      width: (right - left) / paperBounds.width,
      height: (bottom - top) / paperBounds.height,
    };
  });
  const annotation = { id: createAnnotationId(), kind: "text-highlight", rects, text, note: "", color: "#ffd629", createdAt: Date.now() };
  getAnnotations(pageNumber).push(annotation);
  selection.removeAllRanges();
  persistState();
  drawAnnotations(pageNumber);
  renderAnnotationMarkers(pageNumber);
  updateChrome();
  const anchorRect = clientRects.at(-1);
  showHighlightPopover(pageNumber, annotation.id, clientRects[0].left, anchorRect.bottom + 8);
}

function showHighlightPopover(pageNumber, annotationId, x, y) {
  const annotation = getAnnotations(pageNumber).find((item) => ensureAnnotationId(item) === annotationId);
  if (!annotation) return;
  hideSelectionMenu();
  hideRegionPopover();
  state.activeHighlight = { page: pageNumber, id: annotationId };
  elements.highlightSelectedText.textContent = annotation.text || "Đoạn nội dung đã chọn";
  elements.highlightNoteInput.value = annotation.note || "";
  elements.highlightPopover.classList.remove("hidden");
  positionPopover(elements.highlightPopover, x, y);
  setTimeout(() => elements.highlightNoteInput.focus(), 60);
}

function hideHighlightPopover() {
  elements.highlightPopover.classList.add("hidden");
  state.activeHighlight = null;
}

function handleHighlightNoteInput() {
  const active = state.activeHighlight;
  if (!active) return;
  const annotation = getAnnotations(active.page).find((item) => item.id === active.id);
  if (!annotation) return;
  annotation.note = elements.highlightNoteInput.value;
  clearTimeout(state.highlightSaveTimer);
  state.highlightSaveTimer = setTimeout(() => { persistState(); updateChrome(); }, 220);
}

function handleHighlightPopoverAction(event) {
  const button = event.target.closest("[data-highlight-action]");
  if (!button || !state.activeHighlight) return;
  const active = { ...state.activeHighlight };
  if (button.dataset.highlightAction === "done") {
    persistState(); updateChrome(); hideHighlightPopover();
    return;
  }
  const annotations = getAnnotations(active.page);
  const annotation = annotations.find((item) => item.id === active.id);
  if (!annotation) return hideHighlightPopover();
  if (button.dataset.highlightAction === "delete-note") {
    annotation.note = "";
    elements.highlightNoteInput.value = "";
    persistState(); updateChrome();
    showToast("Đã xóa ghi chú, vẫn giữ phần highlight.", "success");
    return;
  }
  const index = annotations.indexOf(annotation);
  if (index >= 0) annotations.splice(index, 1);
  persistState(); drawAnnotations(active.page); renderAnnotationMarkers(active.page); updateChrome(); hideHighlightPopover();
  showToast("Đã xóa highlight được chọn.", "success");
}

function positionPopover(popover, x, y) {
  const bounds = popover.getBoundingClientRect();
  const left = Math.max(10, Math.min(window.innerWidth - bounds.width - 10, x));
  const top = Math.max(10, Math.min(window.innerHeight - bounds.height - 10, y));
  popover.style.left = `${left}px`;
  popover.style.top = `${top}px`;
}

function showRegionPopover(pageNumber, annotation) {
  const paper = getPageShell(pageNumber)?.querySelector(".page-paper");
  if (!paper || !annotation.points?.length) return;
  hideHighlightPopover();
  hideSelectionMenu();
  state.activeRegion = { page: pageNumber, id: ensureAnnotationId(annotation) };
  elements.regionTitle.textContent = `Vùng khoanh Trang ${pageNumber}`;
  elements.regionPopover.classList.remove("hidden");
  const paperBounds = paper.getBoundingClientRect();
  const maxX = Math.max(...annotation.points.map((point) => point.x));
  const minY = Math.min(...annotation.points.map((point) => point.y));
  positionPopover(elements.regionPopover, paperBounds.left + maxX * paperBounds.width + 18, paperBounds.top + minY * paperBounds.height);
}

function hideRegionPopover() {
  elements.regionPopover.classList.add("hidden");
  state.activeRegion = null;
}

function handleRegionAction(event) {
  const button = event.target.closest("[data-region-action]");
  if (!button || !state.activeRegion) return;
  const active = { ...state.activeRegion };
  const action = button.dataset.regionAction;
  if (action === "later") return hideRegionPopover();
  if (action === "tutor") {
    state.currentPage = active.page;
    state.tutorOpen = true;
    updateCurrentPageClass(); updateChrome(); updateWorkspace();
    elements.chatInput.value = `Mình cần trợ giúp với vùng đã khoanh ở trang ${active.page}. Hãy giải thích phần nội dung liên quan trong trang này.`;
    autoGrowComposer();
    hideRegionPopover();
    setTimeout(() => elements.chatInput.focus(), 120);
    return;
  }
  const annotation = getAnnotations(active.page).find((item) => item.id === active.id);
  if (annotation) annotation.reported = true;
  addNote(active.page, `Cần giảng viên hỗ trợ vùng đã khoanh ở trang ${active.page}.`, "confused");
  persistState();
  hideRegionPopover();
  showToast("Đã đánh dấu vùng cần giảng viên hỗ trợ.", "success");
}

function showSelectionMenu(x, y) {
  elements.selectionMenu.classList.remove("hidden");
  const bounds = elements.selectionMenu.getBoundingClientRect();
  elements.selectionMenu.style.left = `${Math.max(8, Math.min(window.innerWidth - bounds.width - 8, x - bounds.width / 2))}px`;
  elements.selectionMenu.style.top = `${Math.max(8, Math.min(window.innerHeight - bounds.height - 8, y))}px`;
}

function hideSelectionMenu() { elements.selectionMenu.classList.add("hidden"); }

function handleSelectionAction(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  hideSelectionMenu();
  if (action === "ask") {
    state.tutorOpen = true; updateWorkspace();
    elements.chatInput.value = state.selectionText ? `Giải thích đoạn này: “${state.selectionText}”` : `Giải thích nội dung chính của trang ${state.selectionPage}.`;
    autoGrowComposer(); elements.chatInput.focus();
  } else if (action === "confused") {
    const text = state.selectionText ? `Mình chưa hiểu: ${state.selectionText}` : "Mình chưa hiểu nội dung trang này.";
    addNote(state.selectionPage, text, "confused");
    showToast("Đã đánh dấu nội dung gây bối rối.", "success");
  } else openNoteModal(state.selectionPage, state.selectionText);
}

function openNoteModal(pageNumber, initialText = "") {
  state.noteDraftPage = pageNumber;
  elements.notePageLabel.textContent = String(pageNumber);
  elements.noteInput.value = initialText ? `Ghi chú về: “${initialText}”\n` : "";
  openModal("noteModal");
  setTimeout(() => elements.noteInput.focus(), 80);
}

function saveNote() {
  const text = elements.noteInput.value.trim();
  if (!text) return showToast("Hãy nhập nội dung ghi chú.", "error");
  addNote(state.noteDraftPage, text, "note");
  closeModal("noteModal");
  showToast("Đã lưu ghi chú.", "success");
}

function addNote(pageNumber, text, type) {
  getNotes(pageNumber).push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, text, type, createdAt: new Date().toISOString() });
  persistState(); renderNoteMarkers(pageNumber); updateChrome();
}

function renderNoteMarkers(pageNumber) {
  const holder = getPageShell(pageNumber)?.querySelector(".page-note-markers");
  if (!holder) return;
  const notes = getNotes(pageNumber);
  holder.innerHTML = notes.length ? `<button class="page-note-marker" aria-label="${notes.length} ghi chú">${icon("note")}</button>` : "";
  holder.querySelector("button")?.addEventListener("click", () => openNotesList(pageNumber));
}

function openNotesList(pageNumber) {
  const notes = getNotes(pageNumber);
  const highlightNotes = getAnnotations(pageNumber).filter((annotation) => annotation.kind === "text-highlight" && annotation.note?.trim());
  elements.notesListPage.textContent = String(pageNumber);
  elements.notesList.innerHTML = notes.length || highlightNotes.length
    ? notes.map((note) => `<article class="note-list-item"><p>${escapeHtml(note.text)}</p><footer><span>${formatTime(note.createdAt)} · ${note.type === "confused" ? "Bối rối" : "Ghi chú"}</span><button data-note-id="${escapeHtml(note.id)}">Xóa</button></footer></article>`).join("") + highlightNotes.map((annotation) => `<article class="note-list-item"><p>${escapeHtml(annotation.note)}</p><footer><span>${formatTime(annotation.createdAt)} · Highlight “${escapeHtml((annotation.text || "").slice(0, 45))}”</span><button data-highlight-note-id="${escapeHtml(ensureAnnotationId(annotation))}">Xóa note</button></footer></article>`).join("")
    : '<p style="color:var(--muted);font-size:13px">Trang này chưa có ghi chú.</p>';
  elements.notesList.querySelectorAll("[data-note-id]").forEach((button) => button.addEventListener("click", () => {
    const notesForPage = getNotes(pageNumber);
    const index = notesForPage.findIndex((note) => note.id === button.dataset.noteId);
    if (index >= 0) notesForPage.splice(index, 1);
    persistState(); renderNoteMarkers(pageNumber); updateChrome(); openNotesList(pageNumber);
  }));
  elements.notesList.querySelectorAll("[data-highlight-note-id]").forEach((button) => button.addEventListener("click", () => {
    const annotation = getAnnotations(pageNumber).find((item) => item.id === button.dataset.highlightNoteId);
    if (annotation) annotation.note = "";
    persistState(); updateChrome(); openNotesList(pageNumber);
  }));
  openModal("notesListModal");
}

function setZoom(nextZoom) {
  const zoom = Math.max(0.6, Math.min(1.5, Math.round(nextZoom * 10) / 10));
  if (zoom === state.zoom) return;
  const anchorPage = state.currentPage;
  state.zoom = zoom;
  persistState();
  if (state.document.type === "demo") renderDemoDocument();
  else rebuildPdfShells();
  updateChrome();
  requestAnimationFrame(() => scrollToPage(anchorPage, "auto"));
}

function rebuildPdfShells() {
  cancelPdfRenders();
  elements.pagesHost.innerHTML = "";
  state.pdfPages.forEach((pageState, index) => {
    pageState.renderedZoom = 0;
    const normalizedWidth = 1000;
    const normalizedHeight = normalizedWidth * pageState.baseHeight / pageState.baseWidth;
    const shell = createPageShell(index + 1, normalizedWidth, normalizedHeight);
    shell.querySelector(".page-paper").insertAdjacentHTML("afterbegin", `<div class="pdf-skeleton">Trang ${index + 1}</div><canvas class="pdf-canvas"></canvas><div class="pdf-text-layer"></div>`);
    elements.pagesHost.appendChild(shell);
    setupAnnotationLayer(shell, index + 1);
    wireReadInteractions(shell, index + 1);
  });
  setupLazyPdfRendering(); updatePageModes(); updateCurrentPageClass();
}

function scrollToPage(pageNumber, behavior = "smooth") {
  const page = Math.max(1, Math.min(state.totalPages, pageNumber));
  const shell = getPageShell(page);
  if (!shell) return;
  shell.scrollIntoView({ behavior, block: "start", inline: "center" });
  setCurrentPage(page);
}

function updateCurrentPageFromScroll() {
  const viewportTop = elements.readerScroll.getBoundingClientRect().top + 125;
  let nearest = state.currentPage; let distance = Infinity;
  elements.pagesHost.querySelectorAll(".page-shell").forEach((shell) => {
    const rect = shell.getBoundingClientRect();
    const currentDistance = Math.abs(rect.top - viewportTop);
    if (currentDistance < distance) { distance = currentDistance; nearest = Number(shell.dataset.page); }
  });
  setCurrentPage(nearest);
}

function setCurrentPage(pageNumber) {
  if (pageNumber === state.currentPage) return;
  state.currentPage = pageNumber;
  updateCurrentPageClass(); updateChrome();
}

function updateCurrentPageClass() {
  elements.pagesHost.querySelectorAll(".page-shell").forEach((shell) => shell.classList.toggle("current", Number(shell.dataset.page) === state.currentPage));
}

function getPageShell(pageNumber) { return elements.pagesHost.querySelector(`.page-shell[data-page="${pageNumber}"]`); }

function updateWorkspace() {
  elements.workspace.classList.toggle("library-closed", !state.leftOpen);
  elements.workspace.classList.toggle("tutor-open", state.tutorOpen);
}

function updateChrome() {
  elements.documentTitle.textContent = state.document.name;
  elements.documentSubtitle.textContent = state.document.type === "demo" ? "COMP2010 · Tài liệu mẫu" : "Tài liệu do bạn tải lên · lưu cục bộ";
  elements.currentPageLabel.textContent = String(state.currentPage);
  elements.totalPagesLabel.textContent = String(state.totalPages);
  elements.zoomLabel.textContent = `${Math.round(state.zoom * 100)}%`;
  const highlightNoteCount = getAnnotations(state.currentPage).filter((annotation) => annotation.kind === "text-highlight" && annotation.note?.trim()).length;
  const count = getNotes(state.currentPage).length + highlightNoteCount;
  elements.pageNotePill.textContent = `Trang ${state.currentPage} · ${count} note`;
  elements.composerPage.textContent = `trang ${state.currentPage}`;
  elements.quotaLabel.textContent = `${state.questionCount} / 15 câu`;
  elements.quotaProgress.style.width = `${Math.min(100, state.questionCount / 15 * 100)}%`;
}

function toggleTheme() { state.theme = state.theme === "light" ? "dark" : "light"; applyTheme(); persistState(); }
function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
  elements.themeButton.dataset.icon = state.theme === "light" ? "moon" : "sun";
  elements.themeButton.innerHTML = icon(state.theme === "light" ? "moon" : "sun");
}

function addWelcomeMessage() {
  state.chat = [{ role: "assistant", answer: "Xin chào! Mình có thể giải thích, tóm tắt và trả lời dựa trên tài liệu bạn đang đọc.\n\nHãy chọn một đoạn trên slide hoặc đặt câu hỏi về trang hiện tại.", citations: [], confidence: 100, mode: "system" }];
  renderChat();
}

function resetChat() { addWelcomeMessage(); showToast("Đã bắt đầu cuộc trò chuyện mới.", "success"); }

async function checkApiHealth() {
  try {
    const response = await fetch("/api/health");
    const data = await response.json();
    state.aiConfigured = Boolean(data.aiConfigured);
    state.aiModel = data.model;
    elements.aiModeLabel.textContent = state.aiConfigured ? "AI LIVE" : "DEMO";
  } catch {
    state.aiConfigured = false;
    elements.aiModeLabel.textContent = "OFFLINE";
  }
}

async function sendQuestion(event) {
  event.preventDefault();
  const question = elements.chatInput.value.trim();
  if (!question || state.sending) return;
  if (state.questionCount >= 15) return showToast("Bạn đã dùng hết quota demo 15 câu hôm nay.", "error");
  state.tutorOpen = true; state.sending = true; updateWorkspace();
  state.chat.push({ role: "user", answer: question });
  elements.chatInput.value = ""; autoGrowComposer(); renderChat(true);
  elements.sendButton.disabled = true;
  const typingId = showTyping();
  const contextPages = selectContextPages(question);

  try {
    const response = await fetch("/api/tutor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, documentName: state.document.name, currentPage: state.currentPage, contextPages }),
    });
    const data = await response.json();
    if (!response.ok && !data.fallback) throw new Error(data.error || "Tutor chưa thể trả lời.");
    state.chat.push({
      role: "assistant",
      answer: data.answer || data.fallback,
      citations: data.citations || contextPages.map((item) => ({ page: item.page, excerpt: item.text.slice(0, 150) })),
      confidence: data.confidence || 65,
      mode: data.mode || "fallback",
    });
    state.questionCount += 1;
    persistState(); updateChrome();
  } catch (error) {
    state.chat.push({ role: "assistant", answer: `Mình chưa thể trả lời lúc này: ${error.message}`, citations: [], confidence: 0, mode: "error" });
  } finally {
    document.querySelector(`[data-typing-id="${typingId}"]`)?.remove();
    state.sending = false; elements.sendButton.disabled = false; renderChat(true); elements.chatInput.focus();
  }
}

function selectContextPages(question) {
  const terms = normalizeWords(question).filter((word) => word.length >= 3);
  const scored = state.pageTexts.map((text, index) => {
    const normalized = text.toLocaleLowerCase("vi");
    const matches = terms.reduce((sum, term) => sum + (normalized.split(term).length - 1), 0);
    const proximity = Math.max(0, 3 - Math.abs(index + 1 - state.currentPage)) * 0.25;
    return { page: index + 1, text: text || "", score: matches + proximity };
  }).filter((item) => item.text);
  scored.sort((a, b) => b.score - a.score);
  const selected = [];
  const current = scored.find((item) => item.page === state.currentPage);
  if (current) selected.push(current);
  scored.forEach((item) => { if (selected.length < 4 && !selected.some((chosen) => chosen.page === item.page)) selected.push(item); });
  return selected.map(({ page, text }) => ({ page, text: text.slice(0, 9000) }));
}

function renderChat(scrollToBottom = false) {
  elements.chatMessages.innerHTML = state.chat.map((message) => {
    if (message.role === "user") return `<article class="message user"><div class="message-bubble">${escapeHtml(message.answer)}</div></article>`;
    const sources = message.citations?.length ? `<div class="source-block"><div class="source-title">${icon("book-open")} ${message.citations.length} nguồn tham khảo</div>${message.citations.map((source) => `<button class="source-card" data-source-page="${source.page}"><strong>TRANG ${source.page}</strong><span>${escapeHtml(source.excerpt || "Nội dung liên quan trong tài liệu")}</span></button>`).join("")}</div>` : "";
    const confidence = message.mode === "system" ? "" : `<div class="confidence-row"><div class="confidence-bar"><span style="width:${message.confidence || 0}%"></span></div><span>${message.confidence || 0}% · ${message.confidence >= 80 ? "Tin cậy cao" : message.confidence >= 60 ? "Nên kiểm tra nguồn" : "Thiếu căn cứ"}</span></div>`;
    const mode = message.mode === "demo" ? '<span class="message-mode">Phản hồi demo</span>' : message.mode === "live" ? '<span class="message-mode" style="background:#dcf8ef;color:#087456">AI LIVE</span>' : "";
    return `<article class="message assistant"><div class="assistant-label">${icon("bot")} VLEARN TUTOR</div><div class="message-bubble">${formatAnswer(message.answer)}</div>${mode}${sources}${confidence}</article>`;
  }).join("");
  elements.chatMessages.querySelectorAll("[data-source-page]").forEach((button) => button.addEventListener("click", () => scrollToPage(Number(button.dataset.sourcePage))));
  if (scrollToBottom) requestAnimationFrame(() => { elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight; });
}

function showTyping() {
  const id = String(Date.now());
  elements.chatMessages.insertAdjacentHTML("beforeend", `<article class="message assistant" data-typing-id="${id}"><div class="assistant-label">${icon("bot")} VLEARN TUTOR</div><div class="typing"><i></i><i></i><i></i></div></article>`);
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
  return id;
}

function autoGrowComposer() { elements.chatInput.style.height = "auto"; elements.chatInput.style.height = `${Math.min(110, elements.chatInput.scrollHeight)}px`; }

function openModal(id) { document.querySelector(`#${CSS.escape(id)}`)?.classList.remove("hidden"); }
function closeModal(id) { document.querySelector(`#${CSS.escape(id)}`)?.classList.add("hidden"); }
function showLoading(visible, detail = "") { elements.loadingState.classList.toggle("hidden", !visible); if (detail) elements.loadingDetail.textContent = detail; }

function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  elements.toastStack.appendChild(toast);
  setTimeout(() => toast.remove(), 3800);
}

function readStoredState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
}

function persistState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ zoom: state.zoom, theme: state.theme, drawColor: state.drawColor, drawWidth: state.drawWidth, annotations: state.annotations, notes: state.notes, questionCount: state.questionCount, questionDate: todayKey }));
  } catch { showToast("Không thể lưu trạng thái cục bộ của trình duyệt.", "error"); }
}

function normalizeWords(text) { return text.toLocaleLowerCase("vi").normalize("NFD").replace(/[\u0300-\u036f]/g, "").match(/[a-z0-9]+/g) || []; }
function formatTime(value) { try { return new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }).format(new Date(value)); } catch { return "Vừa xong"; } }
function formatAnswer(text) { return escapeHtml(text || "").replace(/\[Trang\s+(\d+)\]/gi, '<strong style="color:var(--blue)">[Trang $1]</strong>'); }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[character])); }
