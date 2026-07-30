import * as pdfjsLib from "/vendor/pdf.mjs";
import html2canvas from "/vendor/html2canvas.esm.js";
import { boundsFromPoints, classifyCircledContent, mergeHighlightRects, selectTextFragmentsByBox, toPixelBounds } from "/geometry.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/vendor/pdf.worker.mjs";

const VISUAL_REGIONS = {
  left: { label: "Nhánh Machine Learning", x: 0.057, y: 0.185, width: 0.406, height: 0.648 },
  right: { label: "Nhánh Deep Learning", x: 0.536, y: 0.185, width: 0.406, height: 0.648 },
  whole: { label: "Toàn bộ sơ đồ", x: 0, y: 0, width: 1, height: 1 },
};

const DEMO_PAGES = [
  {
    title: "AI & LLM Foundation",
    text: "AI trong hành động — Nền tảng về trí tuệ nhân tạo và mô hình ngôn ngữ lớn. AI là khả năng hệ thống thực hiện các nhiệm vụ thường cần trí tuệ con người. LLM học các quy luật trong dữ liệu ngôn ngữ để dự đoán và sinh nội dung.",
    layout: "cover",
  },
  {
    title: "Machine Learning và Deep Learning",
    text: "So sánh cách hai phương pháp xử lý đặc trưng trước khi dự đoán.",
    details: "Sơ đồ Hai cách học từ dữ liệu. Machine Learning: dữ liệu thô đi qua bước đặc trưng được thiết kế thủ công, sau đó vào mô hình Machine Learning để tạo dự đoán. Deep Learning: dữ liệu thô đi trực tiếp qua mạng nơ-ron để học đặc trưng và tạo dự đoán.",
    layout: "visual",
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

function demoPageContext(page) {
  return [page.title, page.text, page.details]
    .filter(Boolean)
    .join(". ")
    .replace(/\s+/g, " ")
    .trim();
}

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
const DAILY_QUESTION_LIMIT = 50;
const stored = readStoredState();
const todayKey = new Date().toISOString().slice(0, 10);
const state = {
  document: { id: "demo-foundation", name: "AI trong hành động.pdf", type: "demo" },
  uploadedDocuments: [],
  pdfDocument: null,
  pdfPages: [],
  pageTexts: DEMO_PAGES.map(demoPageContext),
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
  composerSelection: null,
  visualSelection: null,
  noteDraftPage: 1,
  chat: [],
  summaryChats: stored.summaryChats || {},
  activeChatSession: "tutor",
  summaryPromptDismissed: new Set(),
  summaryLoading: false,
  questionCount: stored.questionDate === todayKey ? (stored.questionCount || 0) : 0,
  aiConfigured: false,
  aiProvider: null,
  aiModel: null,
  sending: false,
  renderObserver: null,
  renderTasks: new Map(),
  scrollFrame: null,
  activeHighlight: null,
  activeRegion: null,
  pendingTextHighlight: null,
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
  regionDescription: document.querySelector("#regionDescription"),
  highlightAskPopover: document.querySelector("#highlightAskPopover"),
  lessonSummaryPrompt: document.querySelector("#lessonSummaryPrompt"),
  chatSessionTabs: document.querySelector("#chatSessionTabs"),
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
  document.querySelector("#aiStatusButton").addEventListener("click", () => showToast(state.aiConfigured ? `Tutor đã cấu hình ${state.aiProvider}/${state.aiModel}.` : `Tutor đang ở chế độ demo. Hãy cấu hình ${state.aiProvider || "AI provider"} trên server.`));

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
    state.scrollFrame = requestAnimationFrame(() => { state.scrollFrame = null; updateCurrentPageFromScroll(); maybeShowLessonSummaryPrompt(); });
  }, { passive: true });
  elements.chatForm.addEventListener("submit", sendQuestion);
  elements.chatInput.addEventListener("input", autoGrowComposer);
  elements.chatInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); elements.chatForm.requestSubmit(); }
  });
  elements.selectionMenu.addEventListener("click", handleSelectionAction);
  elements.highlightPopover.addEventListener("click", handleHighlightPopoverAction);
  elements.highlightNoteInput.addEventListener("input", handleHighlightNoteInput);
  elements.highlightAskPopover.addEventListener("click", handleHighlightAskAction);
  elements.regionPopover.addEventListener("click", handleRegionAction);
  elements.lessonSummaryPrompt.addEventListener("click", handleLessonSummaryAction);
  elements.chatSessionTabs.addEventListener("click", handleChatSessionChange);
  document.addEventListener("pointerdown", (event) => {
    if (!elements.selectionMenu.contains(event.target) && !event.target.closest(".page-paper")) hideSelectionMenu();
    if (!elements.highlightPopover.contains(event.target) && !elements.highlightAskPopover.contains(event.target) && !event.target.closest(".annotation-marker")) hideHighlightPopover();
    if (!elements.regionPopover.contains(event.target) && !event.target.closest(".annotation-canvas")) hideRegionPopover();
    if (!elements.moreToolsPanel.contains(event.target) && !event.target.closest("#moreToolsButton") && !event.target.closest(".page-paper")) hideMoreToolsPanel();
  });
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") { hideSelectionMenu(); hideHighlightPopover(); hideHighlightAskPopover(); hideRegionPopover(); hideMoreToolsPanel(); elements.lessonSummaryPrompt.classList.add("hidden"); document.querySelectorAll(".modal-backdrop:not(.hidden)").forEach((modal) => closeModal(modal.id)); }
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
    clearVisualSelection();
    state.document = { id: "demo-foundation", name: "AI trong hành động.pdf", type: "demo" };
    state.pdfDocument = null;
    state.pdfPages = [];
    state.pageTexts = DEMO_PAGES.map(demoPageContext);
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
    wireVisualInteractions(shell, index + 1);
  });
  updatePageModes();
  updateCurrentPageClass();
}

function demoPageMarkup(page, index) {
  const common = `<span class="eyebrow">AI IN ACTION · DAY 1</span>`;
  if (page.layout === "cover") return `<div class="demo-slide cover">${common}<h2>${escapeHtml(page.title)}</h2><p>Bạn đang dùng AI mỗi ngày — nhưng thực sự bên trong nó đang làm gì?</p><div class="accent-line"></div><span class="slide-number">${index + 1}</span></div>`;
  if (page.layout === "visual") return `<div class="demo-slide visual-slide">${common}<h2>${escapeHtml(page.title)}</h2><p>${escapeHtml(page.text)}</p><div class="visual-context-stage"><img src="/assets/ml-vs-dl.svg" alt="Sơ đồ so sánh Machine Learning và Deep Learning" crossorigin="anonymous"><button type="button" class="visual-region" data-visual-region="left" aria-label="Hỏi AI về nhánh Machine Learning"><span>Hỏi vùng này</span></button><button type="button" class="visual-region" data-visual-region="right" aria-label="Hỏi AI về nhánh Deep Learning"><span>Hỏi vùng này</span></button></div><button type="button" class="visual-whole-button" data-visual-region="whole">Chọn toàn bộ sơ đồ</button><span class="slide-number">${index + 1}</span></div>`;
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
  clearVisualSelection();
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
      context.fillStyle = "rgba(255, 196, 61, .2)";
      context.fillRect(x, y, width, height);
    } else if ((annotation.kind === "text-highlight" || annotation.kind === "ai-highlight") && annotation.rects?.length) {
      context.fillStyle = annotation.kind === "ai-highlight"
        ? "rgba(20, 166, 151, .22)"
        : "rgba(255, 196, 61, .22)";
      context.beginPath();
      mergeHighlightRects(annotation.rects).forEach((highlightRect) => {
        const x = highlightRect.x * canvas.width;
        const y = highlightRect.y * canvas.height;
        const width = highlightRect.width * canvas.width;
        const height = highlightRect.height * canvas.height;
        if (typeof context.roundRect === "function") context.roundRect(x, y, width, height, Math.min(4, height * 0.18));
        else context.rect(x, y, width, height);
      });
      context.fill();
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
    showHighlightPopover(pageNumber, button.dataset.highlightId, bounds.left, bounds.bottom + 8, false);
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
  if (annotation.kind === "text-highlight" || annotation.kind === "ai-highlight") {
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
  let highlightGesture = null;
  let readGesture = null;

  paper.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || event.target.closest("button,textarea,input")) return;
    const paperBounds = paper.getBoundingClientRect();
    if (state.mode === "read") {
      readGesture = {
        startClient: { x: event.clientX, y: event.clientY },
        start: normalizedPaperPoint(event, paperBounds),
        current: normalizedPaperPoint(event, paperBounds),
        fragments: collectSelectableTextFragments(paper, paperBounds),
        paperBounds,
      };
      return;
    }
    if (state.mode !== "highlight") return;
    event.preventDefault();
    window.getSelection()?.removeAllRanges();
    highlightGesture = {
      pointerId: event.pointerId,
      start: normalizedPaperPoint(event, paperBounds),
      current: normalizedPaperPoint(event, paperBounds),
      fragments: collectSelectableTextFragments(paper, paperBounds),
      paperBounds,
    };
    try { paper.setPointerCapture(event.pointerId); } catch { /* pointer may already be released */ }
    drawTextHighlightPreview(pageNumber, highlightGesture);
  });
  paper.addEventListener("pointermove", (event) => {
    if (!highlightGesture || event.pointerId !== highlightGesture.pointerId) return;
    event.preventDefault();
    highlightGesture.current = normalizedPaperPoint(event, highlightGesture.paperBounds);
    drawTextHighlightPreview(pageNumber, highlightGesture);
  });
  paper.addEventListener("pointerup", (event) => {
    if (!highlightGesture || event.pointerId !== highlightGesture.pointerId) return;
    event.preventDefault();
    highlightGesture.current = normalizedPaperPoint(event, highlightGesture.paperBounds);
    const completed = highlightGesture;
    highlightGesture = null;
    try { paper.releasePointerCapture(event.pointerId); } catch { /* pointer capture is optional */ }
    createTextHighlightFromGesture(paper, pageNumber, completed);
  });
  paper.addEventListener("pointercancel", () => {
    highlightGesture = null;
    readGesture = null;
    window.getSelection()?.removeAllRanges();
    drawAnnotations(pageNumber);
  });
  paper.addEventListener("contextmenu", (event) => {
    if (state.mode !== "read") return;
    event.preventDefault();
    clearVisualSelection();
    state.selectionText = window.getSelection()?.toString().trim() || "";
    state.selectionPage = pageNumber;
    showSelectionMenu(event.clientX, event.clientY);
    window.getSelection()?.removeAllRanges();
  });
  paper.addEventListener("mouseup", (event) => {
    if (event.button === 2 || event.target.closest("[data-visual-region]")) return;
    if (state.mode === "highlight") {
      window.getSelection()?.removeAllRanges();
      return;
    }
    if (state.mode !== "read") return;
    const completed = readGesture;
    readGesture = null;
    if (!completed || Math.hypot(event.clientX - completed.startClient.x, event.clientY - completed.startClient.y) < 4) return;
    completed.current = normalizedPaperPoint(event, completed.paperBounds);
    const selected = selectedGestureFragments(completed);
    const pending = stagePendingTextHighlight(pageNumber, selected, completed.paperBounds);
    if (pending) {
      clearVisualSelection();
      state.selectionText = pending.annotation.text;
      state.selectionPage = pageNumber;
      showSelectionMenu(event.clientX, event.clientY - 48);
    }
    window.getSelection()?.removeAllRanges();
  });
}

function normalizedPaperPoint(event, paperBounds) {
  return {
    x: Math.max(0, Math.min(1, (event.clientX - paperBounds.left) / paperBounds.width)),
    y: Math.max(0, Math.min(1, (event.clientY - paperBounds.top) / paperBounds.height)),
  };
}

function collectSelectableTextFragments(paper, paperBounds) {
  const root = paper.querySelector(".pdf-text-layer") || paper.querySelector(".demo-slide");
  if (!root) return [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const text = node.textContent?.trim();
      return text && !node.parentElement?.closest("button,textarea,input") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  const fragments = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const matcher = /\S+/gu;
    let match;
    while ((match = matcher.exec(node.textContent))) {
      const range = document.createRange();
      range.setStart(node, match.index);
      range.setEnd(node, match.index + match[0].length);
      [...range.getClientRects()].forEach((rect) => {
        const left = Math.max(rect.left, paperBounds.left);
        const top = Math.max(rect.top, paperBounds.top);
        const right = Math.min(rect.right, paperBounds.right);
        const bottom = Math.min(rect.bottom, paperBounds.bottom);
        if (right - left <= 1 || bottom - top <= 1) return;
        fragments.push({
          text: match[0],
          x: (left - paperBounds.left) / paperBounds.width,
          y: (top - paperBounds.top) / paperBounds.height,
          width: (right - left) / paperBounds.width,
          height: (bottom - top) / paperBounds.height,
        });
      });
    }
  }
  return fragments;
}

function selectedGestureFragments(gesture) {
  return selectTextFragmentsByBox(gesture.fragments, gesture.start, gesture.current, {
    paddingX: 4 / Math.max(1, gesture.paperBounds.width),
    paddingY: 4 / Math.max(1, gesture.paperBounds.height),
    clickTolerance: Math.max(8 / Math.max(1, gesture.paperBounds.width), 8 / Math.max(1, gesture.paperBounds.height)),
  });
}

function drawTextHighlightPreview(pageNumber, gesture) {
  const selected = selectedGestureFragments(gesture);
  const preview = selected.length ? { kind: "text-highlight", rects: selected.map(({ x, y, width, height }) => ({ x, y, width, height })) } : null;
  drawAnnotations(pageNumber, preview);
}

function createTextHighlightFromGesture(paper, pageNumber, gesture) {
  const selected = selectedGestureFragments(gesture);
  window.getSelection()?.removeAllRanges();
  if (!selected.length) {
    drawAnnotations(pageNumber);
    return showToast("Hãy kéo trực tiếp qua phần chữ bạn muốn highlight.", "error");
  }
  const text = selected.map((fragment) => fragment.text).join(" ").replace(/\s+/g, " ").trim().slice(0, 800);
  const rects = mergeHighlightRects(selected.map(({ x, y, width, height }) => ({ x, y, width, height })));
  const annotation = { id: createAnnotationId(), kind: "text-highlight", rects, text, note: "", color: "#ffd629", createdAt: Date.now() };
  getAnnotations(pageNumber).push(annotation);
  persistState();
  drawAnnotations(pageNumber);
  renderAnnotationMarkers(pageNumber);
  updateChrome();
  const anchor = selected.at(-1);
  showHighlightPopover(
    pageNumber,
    annotation.id,
    gesture.paperBounds.left + selected[0].x * gesture.paperBounds.width,
    gesture.paperBounds.top + (anchor.y + anchor.height) * gesture.paperBounds.height + 8,
    true,
  );
}

function stagePendingTextHighlight(pageNumber, selected, paperBounds) {
  discardPendingTextHighlight();
  if (!selected.length) return null;
  const text = selected.map((fragment) => fragment.text).join(" ").replace(/\s+/g, " ").trim().slice(0, 800);
  if (text.length < 2) return null;
  const rects = mergeHighlightRects(selected.map(({ x, y, width, height }) => ({ x, y, width, height })));
  const anchor = selected.at(-1);
  const pending = {
    page: pageNumber,
    annotation: { id: createAnnotationId(), kind: "text-highlight", rects, text, note: "", color: "#ffd629", createdAt: Date.now() },
    anchorX: paperBounds.left + selected[0].x * paperBounds.width,
    anchorY: paperBounds.top + (anchor.y + anchor.height) * paperBounds.height + 8,
  };
  state.pendingTextHighlight = pending;
  drawAnnotations(pageNumber, pending.annotation);
  return pending;
}

function discardPendingTextHighlight() {
  const pending = state.pendingTextHighlight;
  if (!pending) return;
  state.pendingTextHighlight = null;
  drawAnnotations(pending.page);
}

function commitPendingTextHighlight() {
  const pending = state.pendingTextHighlight;
  if (!pending) return null;
  state.pendingTextHighlight = null;
  getAnnotations(pending.page).push(pending.annotation);
  persistState();
  drawAnnotations(pending.page);
  renderAnnotationMarkers(pending.page);
  updateChrome();
  return pending;
}

function showHighlightPopover(pageNumber, annotationId, x, y, offerTutor = false) {
  const annotation = getAnnotations(pageNumber).find((item) => ensureAnnotationId(item) === annotationId);
  if (!annotation) return;
  hideSelectionMenu();
  hideRegionPopover();
  state.activeHighlight = { page: pageNumber, id: annotationId };
  elements.highlightSelectedText.textContent = annotation.text || "Đoạn nội dung đã chọn";
  elements.highlightNoteInput.value = annotation.note || "";
  elements.highlightPopover.classList.remove("hidden");
  positionPopover(elements.highlightPopover, x, y);
  if (offerTutor) showHighlightAskPopover();
  else hideHighlightAskPopover();
  setTimeout(() => elements.highlightNoteInput.focus(), 60);
}

function hideHighlightPopover() {
  elements.highlightPopover.classList.add("hidden");
  hideHighlightAskPopover();
  state.activeHighlight = null;
}

function showHighlightAskPopover() {
  const noteBounds = elements.highlightPopover.getBoundingClientRect();
  elements.highlightAskPopover.classList.remove("hidden");
  const askBounds = elements.highlightAskPopover.getBoundingClientRect();
  const gap = 10;
  const right = noteBounds.right + gap;
  const left = right + askBounds.width <= window.innerWidth - 10
    ? right
    : Math.max(10, noteBounds.left - askBounds.width - gap);
  const top = Math.max(10, Math.min(window.innerHeight - askBounds.height - 10, noteBounds.top));
  elements.highlightAskPopover.style.left = `${left}px`;
  elements.highlightAskPopover.style.top = `${top}px`;
}

function hideHighlightAskPopover() {
  elements.highlightAskPopover.classList.add("hidden");
}

function handleHighlightAskAction(event) {
  const button = event.target.closest("[data-highlight-ask]");
  if (!button) return;
  if (button.dataset.highlightAsk === "no") return hideHighlightAskPopover();
  const active = state.activeHighlight ? { ...state.activeHighlight } : null;
  const annotation = active && getAnnotations(active.page).find((item) => item.id === active.id);
  if (!annotation?.text) return hideHighlightAskPopover();
  state.selectionText = annotation.text;
  state.selectionPage = active.page;
  state.currentPage = active.page;
  state.activeChatSession = "tutor";
  state.tutorOpen = true;
  updateCurrentPageClass();
  updateWorkspace();
  updateChrome();
  hideHighlightPopover();
  void submitQuestion(`Giải thích đoạn đã bôi đen này: “${annotation.text}”`, {
    visualSelection: null,
    selectedText: annotation.text,
    selectedPage: active.page,
  });
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
  let region = null;
  try { region = boundsFromPoints(annotation.points, 0.025); } catch { /* validated when Tutor is selected */ }
  const selectedText = region ? collectTextInsideRegion(paper, region) : "";
  const contentKind = classifyCircledContent(selectedText, region ? hasExplicitVisualInsideRegion(paper, region) : false);
  state.activeRegion = { page: pageNumber, id: ensureAnnotationId(annotation), region, contentKind };
  elements.regionTitle.textContent = `Vùng khoanh Trang ${pageNumber}`;
  elements.regionDescription.textContent = {
    text: "Bạn muốn Tutor giải thích đoạn nội dung này?",
    visual: "Bạn muốn Tutor giải thích hình hoặc sơ đồ này?",
    mixed: "Bạn muốn Tutor giải thích nội dung trong vùng này?",
  }[contentKind];
  elements.regionPopover.classList.remove("hidden");
  const paperBounds = paper.getBoundingClientRect();
  const minX = Math.min(...annotation.points.map((point) => point.x));
  const maxX = Math.max(...annotation.points.map((point) => point.x));
  const minY = Math.min(...annotation.points.map((point) => point.y));
  const maxY = Math.max(...annotation.points.map((point) => point.y));
  positionRegionPopover({
    left: paperBounds.left + minX * paperBounds.width,
    right: paperBounds.left + maxX * paperBounds.width,
    top: paperBounds.top + minY * paperBounds.height,
    bottom: paperBounds.top + maxY * paperBounds.height,
  });
}

function positionRegionPopover(target) {
  const popover = elements.regionPopover;
  const bounds = popover.getBoundingClientRect();
  const gap = 14;
  const viewportGap = 10;
  let side = "right";
  let left = target.right + gap;
  let top = target.top + ((target.bottom - target.top) - bounds.height) / 2;

  if (left + bounds.width > window.innerWidth - viewportGap) {
    const leftCandidate = target.left - bounds.width - gap;
    if (leftCandidate >= viewportGap) {
      side = "left";
      left = leftCandidate;
    } else {
      side = "bottom";
      left = target.left + ((target.right - target.left) - bounds.width) / 2;
      top = target.bottom + gap;
      if (top + bounds.height > window.innerHeight - viewportGap) {
        side = "top";
        top = target.top - bounds.height - gap;
      }
    }
  }

  left = Math.max(viewportGap, Math.min(window.innerWidth - bounds.width - viewportGap, left));
  top = Math.max(viewportGap, Math.min(window.innerHeight - bounds.height - viewportGap, top));
  popover.dataset.side = side;
  popover.style.left = `${left}px`;
  popover.style.top = `${top}px`;
}

function hideRegionPopover() {
  elements.regionPopover.classList.add("hidden");
  state.activeRegion = null;
}

function hasExplicitVisualInsideRegion(paper, region) {
  const paperBounds = paper.getBoundingClientRect();
  const target = {
    left: paperBounds.left + region.x * paperBounds.width,
    top: paperBounds.top + region.y * paperBounds.height,
    right: paperBounds.left + (region.x + region.width) * paperBounds.width,
    bottom: paperBounds.top + (region.y + region.height) * paperBounds.height,
  };
  return [...paper.querySelectorAll("img,.visual-context-stage,.diagram-orbit,.timeline,.card-grid")].some((element) => {
    const rect = element.getBoundingClientRect();
    return rect.width > 0
      && rect.height > 0
      && rect.left < target.right
      && rect.right > target.left
      && rect.top < target.bottom
      && rect.bottom > target.top;
  });
}

function circledQuestion(contentKind) {
  return {
    text: "Giải thích đoạn nội dung mình vừa đánh dấu.",
    visual: "Giải thích hình hoặc sơ đồ mình vừa đánh dấu.",
    mixed: "Giải thích nội dung trong vùng mình vừa đánh dấu.",
  }[contentKind] || "Giải thích nội dung trong vùng mình vừa đánh dấu.";
}

function handleRegionAction(event) {
  const button = event.target.closest("[data-region-action]");
  if (!button || !state.activeRegion) return;
  const active = { ...state.activeRegion };
  const action = button.dataset.regionAction;
  if (action === "later") return hideRegionPopover();
  if (action === "tutor") {
    const annotation = getAnnotations(active.page).find((item) => item.id === active.id);
    if (!annotation) return hideRegionPopover();
    let region = active.region;
    try {
      region ||= boundsFromPoints(annotation.points, 0.025);
    } catch {
      hideRegionPopover();
      return showToast("Vùng khoanh quá nhỏ. Hãy khoanh rộng hơn một chút.", "error");
    }
    state.visualSelection = {
      kind: "annotation",
      annotationId: active.id,
      pageNumber: active.page,
      region,
      contentKind: active.contentKind || "mixed",
    };
    state.selectionText = "";
    state.currentPage = active.page;
    state.activeChatSession = "tutor";
    state.tutorOpen = true;
    updateVisualSelection(); updateCurrentPageClass(); updateChrome(); updateWorkspace();
    hideRegionPopover();
    void submitQuestion(circledQuestion(state.visualSelection.contentKind), { visualSelection: { ...state.visualSelection } });
    return;
  }
  const annotation = getAnnotations(active.page).find((item) => item.id === active.id);
  if (annotation) annotation.reported = true;
  addNote(active.page, `Cần giảng viên hỗ trợ vùng đã khoanh ở trang ${active.page}.`, "confused");
  persistState();
  hideRegionPopover();
  showToast("Đã đánh dấu vùng cần giảng viên hỗ trợ.", "success");
}

function wireVisualInteractions(shell, pageNumber) {
  shell.querySelectorAll("[data-visual-region]").forEach((button) => {
    button.addEventListener("click", () => selectVisualRegion(button.dataset.visualRegion, pageNumber));
  });
  updateVisualSelection();
}

function selectVisualRegion(regionName, pageNumber) {
  const region = VISUAL_REGIONS[regionName];
  if (!region) return;
  state.visualSelection = { kind: "preset", regionName, pageNumber, contentKind: "visual" };
  state.selectionText = "";
  state.currentPage = pageNumber;
  state.tutorOpen = true;
  elements.chatInput.value = regionName === "whole"
    ? "Giải thích toàn bộ sơ đồ này."
    : `Giải thích ${region.label.toLocaleLowerCase("vi")} trong hình.`;
  updateVisualSelection();
  updateCurrentPageClass();
  updateWorkspace();
  updateChrome();
  autoGrowComposer();
  elements.chatInput.focus();
}

function clearVisualSelection() {
  if (!state.visualSelection) return;
  state.visualSelection = null;
  updateVisualSelection();
  updateChrome();
}

function updateVisualSelection() {
  elements.pagesHost.querySelectorAll("[data-visual-region]").forEach((button) => {
    const shell = button.closest(".page-shell");
    const selected = Number(shell?.dataset.page) === state.visualSelection?.pageNumber
      && button.dataset.visualRegion === state.visualSelection?.regionName;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}

async function cropSelectedRegion(selection) {
  if (selection.kind === "annotation") return captureCircledRegion(selection);
  const shell = getPageShell(selection.pageNumber);
  const image = shell?.querySelector(".visual-context-stage img");
  const region = VISUAL_REGIONS[selection.regionName];
  if (!image || !region) throw new Error("Không tìm thấy vùng hình đã chọn.");
  if (!image.complete) await image.decode();
  const bounds = toPixelBounds(region, image.naturalWidth, image.naturalHeight);
  const scale = Math.min(1, 1400 / Math.max(bounds.sw, bounds.sh));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bounds.sw * scale));
  canvas.height = Math.max(1, Math.round(bounds.sh * scale));
  canvas.getContext("2d").drawImage(image, bounds.sx, bounds.sy, bounds.sw, bounds.sh, 0, 0, canvas.width, canvas.height);
  return { imageData: canvas.toDataURL("image/png").split(",")[1], selectedText: "" };
}

async function captureCircledRegion(selection) {
  const paper = getPageShell(selection.pageNumber)?.querySelector(".page-paper");
  if (!paper || !selection.region) throw new Error("Không tìm thấy vùng hình đã khoanh.");

  const screenshot = await html2canvas(paper, {
    backgroundColor: getComputedStyle(paper).backgroundColor || "#ffffff",
    scale: Math.min(window.devicePixelRatio || 1, 2),
    useCORS: true,
    logging: false,
    ignoreElements: (element) => (
      element.classList?.contains("annotation-canvas")
      || element.classList?.contains("annotation-markers")
      || element.classList?.contains("page-note-markers")
      || element.matches?.("[data-visual-region], .visual-whole-button")
    ),
  });
  const bounds = toPixelBounds(selection.region, screenshot.width, screenshot.height);
  const scale = Math.min(1, 2048 / Math.max(bounds.sw, bounds.sh));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bounds.sw * scale));
  canvas.height = Math.max(1, Math.round(bounds.sh * scale));
  canvas.getContext("2d").drawImage(
    screenshot,
    bounds.sx,
    bounds.sy,
    bounds.sw,
    bounds.sh,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  return {
    imageData: canvas.toDataURL("image/png").split(",")[1],
    selectedText: collectTextInsideRegion(paper, selection.region),
  };
}

function collectTextInsideRegion(paper, region) {
  const paperBounds = paper.getBoundingClientRect();
  const target = {
    left: paperBounds.left + region.x * paperBounds.width,
    top: paperBounds.top + region.y * paperBounds.height,
    right: paperBounds.left + (region.x + region.width) * paperBounds.width,
    bottom: paperBounds.top + (region.y + region.height) * paperBounds.height,
  };
  const walker = document.createTreeWalker(paper, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const text = node.textContent?.replace(/\s+/g, " ").trim();
      if (!text || node.parentElement?.closest(".annotation-markers,.page-note-markers,[data-visual-region],.visual-whole-button")) {
        return NodeFilter.FILTER_REJECT;
      }
      const range = document.createRange();
      range.selectNodeContents(node);
      const rect = range.getBoundingClientRect();
      const intersects = rect.width > 0
        && rect.height > 0
        && rect.left < target.right
        && rect.right > target.left
        && rect.top < target.bottom
        && rect.bottom > target.top;
      return intersects ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  const parts = [];
  while (walker.nextNode()) {
    const text = walker.currentNode.textContent.replace(/\s+/g, " ").trim();
    if (text && !parts.includes(text)) parts.push(text);
  }
  return parts.join(" · ").slice(0, 4000);
}

function showSelectionMenu(x, y) {
  elements.selectionMenu.classList.remove("hidden");
  const bounds = elements.selectionMenu.getBoundingClientRect();
  elements.selectionMenu.style.left = `${Math.max(8, Math.min(window.innerWidth - bounds.width - 8, x - bounds.width / 2))}px`;
  elements.selectionMenu.style.top = `${Math.max(8, Math.min(window.innerHeight - bounds.height - 8, y))}px`;
}

function hideSelectionMenu() {
  elements.selectionMenu.classList.add("hidden");
  discardPendingTextHighlight();
}

function handleSelectionAction(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  const committed = commitPendingTextHighlight();
  hideSelectionMenu();
  if (action === "ask") {
    state.composerSelection = state.selectionText
      ? { text: state.selectionText, page: state.selectionPage }
      : null;
    state.tutorOpen = true; updateWorkspace();
    elements.chatInput.value = state.selectionText ? `Giải thích đoạn này: “${state.selectionText}”` : `Giải thích nội dung chính của trang ${state.selectionPage}.`;
    autoGrowComposer(); elements.chatInput.focus();
  } else if (action === "confused") {
    const text = state.selectionText ? `Mình chưa hiểu: ${state.selectionText}` : "Mình chưa hiểu nội dung trang này.";
    addNote(state.selectionPage, text, "confused");
    showToast("Đã đánh dấu nội dung gây bối rối.", "success");
  } else if (committed) {
    showHighlightPopover(committed.page, committed.annotation.id, committed.anchorX, committed.anchorY, false);
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

function maybeShowLessonSummaryPrompt() {
  const nearBottom = elements.readerScroll.scrollTop + elements.readerScroll.clientHeight
    >= elements.readerScroll.scrollHeight - 90;
  const key = state.document.id;
  const shouldShow = nearBottom
    && !state.summaryPromptDismissed.has(key)
    && !getSummarySession(false)
    && !state.summaryLoading;
  elements.lessonSummaryPrompt.classList.toggle("hidden", !shouldShow);
}

function handleLessonSummaryAction(event) {
  const button = event.target.closest("[data-summary-action]");
  if (!button) return;
  elements.lessonSummaryPrompt.classList.add("hidden");
  if (button.dataset.summaryAction === "dismiss") {
    state.summaryPromptDismissed.add(state.document.id);
    return;
  }
  void createLessonSummarySession();
}

async function createLessonSummarySession() {
  if (state.summaryLoading) return;
  if (state.questionCount >= DAILY_QUESTION_LIMIT) return showToast(`Bạn đã dùng hết quota demo ${DAILY_QUESTION_LIMIT} câu hôm nay.`, "error");
  state.summaryLoading = true;
  state.summaryPromptDismissed.add(state.document.id);
  state.activeChatSession = "summary";
  state.visualSelection = null;
  state.tutorOpen = true;
  const session = getSummarySession(true);
  session.messages = [{ role: "user", answer: "Tóm tắt bài học và đánh dấu các điểm mình cần ghi nhớ." }];
  updateWorkspace();
  updateChrome();
  renderChat(true);
  const typingId = showTyping();

  try {
    const pages = state.pageTexts.map((text, index) => ({ page: index + 1, text: (text || "").slice(0, 5_000) })).filter((item) => item.text);
    const response = await fetch("/api/summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentName: state.document.name, pages }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Chưa thể tóm tắt bài học.");
    session.keyPoints = result.key_points || [];
    const points = session.keyPoints.map((item) => `• ${item.explanation} [Trang ${item.page}]`).join("\n");
    session.messages.push({
      role: "assistant",
      answer: `${result.summary}${points ? `\n\nCác điểm cần ghi nhớ:\n${points}` : ""}`,
      citations: session.keyPoints.map((item) => ({ page: item.page, excerpt: item.quote })),
      confidence: result.mode === "live" ? 86 : 68,
      mode: "summary",
    });
    await applySuggestedHighlights(session.keyPoints);
    state.questionCount += 1;
    persistState();
  } catch (error) {
    session.messages.push({ role: "assistant", answer: `Mình chưa thể tạo bản tóm tắt: ${error.message}`, citations: [], confidence: 0, mode: "error" });
  } finally {
    document.querySelector(`[data-typing-id="${typingId}"]`)?.remove();
    state.summaryLoading = false;
    updateChrome();
    renderChat(true);
  }
}

async function applySuggestedHighlights(keyPoints) {
  Object.values(state.annotations[state.document.id] || {}).forEach((annotations) => {
    for (let index = annotations.length - 1; index >= 0; index -= 1) {
      if (annotations[index].kind === "ai-highlight") annotations.splice(index, 1);
    }
  });

  for (const point of keyPoints.slice(0, 8)) {
    const pageNumber = Number(point.page);
    if (state.document.type === "pdf") await renderPdfPage(pageNumber);
    const paper = getPageShell(pageNumber)?.querySelector(".page-paper");
    if (!paper) continue;
    const rects = findTextRectsForQuote(paper, point.quote);
    if (!rects.length) continue;
    getAnnotations(pageNumber).push({
      id: createAnnotationId(),
      kind: "ai-highlight",
      rects,
      text: point.quote,
      source: "lesson-summary",
      color: "#14a697",
      createdAt: Date.now(),
    });
    drawAnnotations(pageNumber);
  }
  persistState();
}

function findTextRectsForQuote(paper, quote) {
  const root = paper.querySelector(".pdf-text-layer") || paper.querySelector(".demo-slide");
  if (!root || !quote) return [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const text = node.textContent?.replace(/\s+/g, " ").trim();
      return text && !node.parentElement?.closest("button") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  const segments = [];
  let combined = "";
  while (walker.nextNode()) {
    const text = walker.currentNode.textContent.replace(/\s+/g, " ").trim();
    const start = combined.length;
    combined += `${combined ? " " : ""}${text}`;
    segments.push({ node: walker.currentNode, start: start + (start ? 1 : 0), end: combined.length });
  }
  const needle = quote.replace(/\s+/g, " ").trim();
  let matchStart = combined.toLocaleLowerCase("vi").indexOf(needle.toLocaleLowerCase("vi"));
  let matchEnd = matchStart + needle.length;
  if (matchStart < 0) {
    const terms = normalizeWords(needle).filter((word) => word.length > 3);
    const best = segments.map((segment) => ({
      segment,
      score: terms.filter((term) => normalizeWords(segment.node.textContent).includes(term)).length,
    })).sort((a, b) => b.score - a.score)[0];
    if (!best?.score) return [];
    matchStart = best.segment.start;
    matchEnd = best.segment.end;
  }
  const paperBounds = paper.getBoundingClientRect();
  const rects = [];
  segments.filter((segment) => segment.end > matchStart && segment.start < matchEnd).forEach((segment) => {
    const range = document.createRange();
    range.selectNodeContents(segment.node);
    [...range.getClientRects()].forEach((rect) => {
      const left = Math.max(rect.left, paperBounds.left);
      const top = Math.max(rect.top, paperBounds.top);
      const right = Math.min(rect.right, paperBounds.right);
      const bottom = Math.min(rect.bottom, paperBounds.bottom);
      if (right > left && bottom > top) rects.push({
        x: (left - paperBounds.left) / paperBounds.width,
        y: (top - paperBounds.top) / paperBounds.height,
        width: (right - left) / paperBounds.width,
        height: (bottom - top) / paperBounds.height,
      });
    });
  });
  return mergeHighlightRects(rects);
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
  elements.composerPage.textContent = state.visualSelection
    ? state.visualSelection.kind === "annotation"
      ? `vùng khoanh · slide ${state.visualSelection.pageNumber}`
      : `${VISUAL_REGIONS[state.visualSelection.regionName]?.label || "vùng hình"} · slide ${state.visualSelection.pageNumber}`
    : `trang ${state.currentPage}`;
  elements.quotaLabel.textContent = `${state.questionCount} / ${DAILY_QUESTION_LIMIT} câu`;
  elements.quotaProgress.style.width = `${Math.min(100, state.questionCount / DAILY_QUESTION_LIMIT * 100)}%`;
  renderChatSessionTabs();
}

function renderChatSessionTabs() {
  const summaryExists = Boolean(getSummarySession(false));
  elements.chatSessionTabs.querySelectorAll("[data-chat-session]").forEach((button) => {
    if (button.dataset.chatSession === "summary") button.classList.toggle("hidden", !summaryExists);
    button.classList.toggle("active", button.dataset.chatSession === state.activeChatSession);
  });
}

function toggleTheme() { state.theme = state.theme === "light" ? "dark" : "light"; applyTheme(); persistState(); }
function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
  elements.themeButton.dataset.icon = state.theme === "light" ? "moon" : "sun";
  elements.themeButton.innerHTML = icon(state.theme === "light" ? "moon" : "sun");
}

function addWelcomeMessage() {
  state.activeChatSession = "tutor";
  state.chat = [{ role: "assistant", answer: "Xin chào! Mình có thể giải thích, tóm tắt và trả lời dựa trên tài liệu bạn đang đọc.\n\nHãy chọn một đoạn trên slide hoặc đặt câu hỏi về trang hiện tại.", citations: [], confidence: 100, mode: "system" }];
  renderChat();
}

function resetChat() {
  state.composerSelection = null;
  addWelcomeMessage();
  showToast("Đã bắt đầu cuộc trò chuyện mới.", "success");
}

function getSummarySession(create = false) {
  const key = state.document.id;
  if (create && !state.summaryChats[key]) {
    state.summaryChats[key] = { messages: [], keyPoints: [], createdAt: new Date().toISOString() };
  }
  return state.summaryChats[key] || null;
}

function getActiveChatMessages() {
  if (state.activeChatSession === "summary") return getSummarySession(true).messages;
  return state.chat;
}

function handleChatSessionChange(event) {
  const button = event.target.closest("[data-chat-session]");
  if (!button || button.classList.contains("hidden")) return;
  state.activeChatSession = button.dataset.chatSession;
  renderChat(true);
  updateChrome();
}

async function checkApiHealth() {
  try {
    const response = await fetch("/api/health");
    const data = await response.json();
    state.aiConfigured = Boolean(data.aiConfigured);
    state.aiProvider = data.provider;
    state.aiModel = data.model;
    elements.aiModeLabel.textContent = state.aiConfigured ? "AI READY" : "DEMO";
  } catch {
    state.aiConfigured = false;
    elements.aiModeLabel.textContent = "OFFLINE";
  }
}

async function sendQuestion(event) {
  event.preventDefault();
  const question = elements.chatInput.value.trim();
  await submitQuestion(question);
}

async function submitQuestion(question, options = {}) {
  const visualSelection = Object.hasOwn(options, "visualSelection")
    ? options.visualSelection
    : (state.visualSelection ? { ...state.visualSelection } : null);
  const selectedText = Object.hasOwn(options, "selectedText")
    ? options.selectedText
    : (state.composerSelection?.text || "");
  const selectedPage = Object.hasOwn(options, "selectedPage")
    ? options.selectedPage
    : (state.composerSelection?.page || state.currentPage);
  if (!question || state.sending) return;
  if (state.questionCount >= DAILY_QUESTION_LIMIT) return showToast(`Bạn đã dùng hết quota demo ${DAILY_QUESTION_LIMIT} câu hôm nay.`, "error");
  state.tutorOpen = true; state.sending = true; updateWorkspace();
  const messages = getActiveChatMessages();
  messages.push({ role: "user", answer: question });
  elements.chatInput.value = ""; autoGrowComposer(); renderChat(true);
  elements.sendButton.disabled = true;
  const typingId = showTyping();

  try {
    if (visualSelection) await sendVisualQuestion(question, visualSelection, messages);
    else await sendTextQuestion(question, messages, { selectedText, selectedPage });
    state.questionCount += 1;
    persistState(); updateChrome();
  } catch (error) {
    messages.push({ role: "assistant", answer: `Mình chưa thể trả lời lúc này: ${error.message}`, citations: [], confidence: 0, mode: "error" });
  } finally {
    document.querySelector(`[data-typing-id="${typingId}"]`)?.remove();
    state.composerSelection = null;
    state.sending = false; elements.sendButton.disabled = false; renderChat(true); elements.chatInput.focus();
  }
}

async function sendTextQuestion(question, messages = getActiveChatMessages(), selection = {}) {
  const contextPages = selectContextPages(question);
  const response = await fetch("/api/tutor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question,
      documentName: state.document.name,
      currentPage: state.currentPage,
      contextPages,
      selectedText: selection.selectedText || "",
      selectedPage: selection.selectedPage || state.currentPage,
    }),
  });
  const data = await response.json();
  if (!response.ok && !data.fallback) throw new Error(data.error || "Tutor chưa thể trả lời.");
  messages.push({
    role: "assistant",
    answer: data.answer || data.fallback,
    citations: data.citations || contextPages.map((item) => ({ page: item.page, excerpt: item.text.slice(0, 150) })),
    confidence: data.confidence || 65,
    mode: data.mode || "fallback",
  });
}

async function sendVisualQuestion(question, selection, messages = getActiveChatMessages()) {
  const capture = await cropSelectedRegion(selection);
  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imageData: capture.imageData,
      mediaType: "image/png",
      question,
      slideNumber: selection.pageNumber,
      nearbyText: (state.pageTexts[selection.pageNumber - 1] || "").slice(0, 4000),
      selectedText: capture.selectedText,
      contentKind: selection.contentKind || (selection.kind === "preset" ? "visual" : "mixed"),
      selectionCoverage: selection.kind === "annotation"
        ? Math.min(1, selection.region.width * selection.region.height)
        : Math.min(1, (VISUAL_REGIONS[selection.regionName]?.width || 1) * (VISUAL_REGIONS[selection.regionName]?.height || 1)),
    }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Visual Tutor chưa thể trả lời.");
  messages.push({
    role: "assistant",
    answer: result.route === "VISUAL_GROUNDED" ? result.answer : result.reason,
    mode: "visual",
    visualRoute: result.route,
    visualPage: selection.pageNumber,
    visualSelectionKind: selection.kind,
    visualContentKind: selection.contentKind || "mixed",
    recoveryAction: result.recovery_action,
  });
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
  const messages = getActiveChatMessages();
  renderChatSessionTabs();
  elements.chatMessages.innerHTML = messages.map((message) => {
    if (message.role === "user") return `<article class="message user"><div class="message-bubble">${escapeHtml(message.answer)}</div></article>`;
    const sources = message.citations?.length ? `<div class="source-block"><div class="source-title">${icon("book-open")} ${message.citations.length} nguồn tham khảo</div>${message.citations.map((source) => `<button class="source-card" data-source-page="${source.page}"><strong>TRANG ${source.page}</strong><span>${escapeHtml(source.excerpt || "Nội dung liên quan trong tài liệu")}</span></button>`).join("")}</div>` : "";
    const confidence = message.mode === "system" || message.mode === "visual" || message.mode === "summary" ? "" : `<div class="confidence-row"><div class="confidence-bar"><span style="width:${message.confidence || 0}%"></span></div><span>${message.confidence || 0}% · ${message.confidence >= 80 ? "Tin cậy cao" : message.confidence >= 60 ? "Nên kiểm tra nguồn" : "Thiếu căn cứ"}</span></div>`;
    const regionMode = message.visualContentKind === "text" ? "AI VĂN BẢN" : message.visualContentKind === "visual" ? "VISUAL AI" : "AI VÙNG CHỌN";
    const mode = message.mode === "demo" ? '<span class="message-mode">Phản hồi demo</span>' : message.mode === "live" ? '<span class="message-mode" style="background:#dcf8ef;color:#087456">AI LIVE</span>' : message.mode === "visual" ? `<span class="message-mode visual-mode">${regionMode}</span>` : message.mode === "summary" ? '<span class="message-mode" style="background:#e1f7f2;color:#08796c">TÓM TẮT RIÊNG</span>' : "";
    const visual = message.mode === "visual" ? renderVisualEvidence(message) : "";
    const legend = message.mode === "summary" ? '<div class="suggested-highlight-legend">Màu xanh ngọc trên slide là điểm AI gợi ý cần ghi nhớ.</div>' : "";
    return `<article class="message assistant"><div class="assistant-label">${icon("bot")} ${message.mode === "summary" ? "TÓM TẮT BÀI HỌC" : "VLEARN TUTOR"}</div><div class="message-bubble">${formatAnswer(message.answer)}</div>${mode}${legend}${visual}${sources}${confidence}</article>`;
  }).join("");
  elements.chatMessages.querySelectorAll("[data-source-page]").forEach((button) => button.addEventListener("click", () => scrollToPage(Number(button.dataset.sourcePage))));
  elements.chatMessages.querySelectorAll("[data-visual-recovery]").forEach((button) => button.addEventListener("click", () => {
    const pageNumber = Number(button.dataset.visualRecovery);
    if (button.dataset.selectionKind === "annotation") {
      scrollToPage(pageNumber);
      setMode("circle");
    } else selectVisualRegion("whole", pageNumber);
  }));
  if (scrollToBottom) requestAnimationFrame(() => { elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight; });
}

function renderVisualEvidence(message) {
  const sourceLabel = message.visualContentKind === "text"
    ? "đoạn chữ được khoanh"
    : message.visualContentKind === "visual"
      ? "hình hoặc sơ đồ được khoanh"
      : "vùng nội dung được khoanh";
  if (message.visualRoute === "VISUAL_GROUNDED") return `<div class="visual-provenance">Dựa trên ${sourceLabel} ở slide ${message.visualPage}</div>`;
  const action = message.recoveryAction ? `<p>${escapeHtml(message.recoveryAction)}</p>` : "";
  const widerButton = message.visualRoute === "NEED_WIDER_REGION"
    ? `<button type="button" class="visual-recovery" data-visual-recovery="${message.visualPage}" data-selection-kind="${message.visualSelectionKind || "preset"}">${message.visualSelectionKind === "annotation" ? "Khoanh vùng rộng hơn" : "Chọn toàn bộ sơ đồ"}</button>`
    : "";
  return `<div class="visual-recovery-card"><strong>${visualRouteLabel(message.visualRoute, message.visualContentKind)}</strong>${action}${widerButton}</div>`;
}

function visualRouteLabel(route, contentKind = "mixed") {
  return {
    NEED_WIDER_REGION: "Cần vùng nội dung rộng hơn",
    NEED_BETTER_IMAGE: contentKind === "visual" ? "Cần hình rõ hơn" : "Cần nội dung rõ hơn",
    INSUFFICIENT: "Chưa đủ căn cứ để trả lời",
  }[route] || "Chưa thể phân tích vùng đã khoanh";
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ zoom: state.zoom, theme: state.theme, drawColor: state.drawColor, drawWidth: state.drawWidth, annotations: state.annotations, notes: state.notes, summaryChats: state.summaryChats, questionCount: state.questionCount, questionDate: todayKey }));
  } catch { showToast("Không thể lưu trạng thái cục bộ của trình duyệt.", "error"); }
}

function normalizeWords(text) { return text.toLocaleLowerCase("vi").normalize("NFD").replace(/[\u0300-\u036f]/g, "").match(/[a-z0-9]+/g) || []; }
function formatTime(value) { try { return new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }).format(new Date(value)); } catch { return "Vừa xong"; } }
function formatAnswer(text) { return escapeHtml(text || "").replace(/\[Trang\s+(\d+)\]/gi, '<strong style="color:var(--blue)">[Trang $1]</strong>'); }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[character])); }
