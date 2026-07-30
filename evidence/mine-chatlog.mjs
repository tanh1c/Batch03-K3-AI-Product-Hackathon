import { readFile } from "node:fs/promises";

const csvPath = new URL("../data/vlearn-pack/chatlog/chat_history_anonymized_for_hackathon.csv", import.meta.url);
const rows = parseCsv(await readFile(csvPath, "utf8"));
const headers = rows.shift();
const records = rows.map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])));
const turns = new Map();

for (const record of records) {
  const turn = turns.get(record.turn_id) || { conversation_id: record.conversation_id, turn_id: record.turn_id };
  turn[record.role] = record;
  turns.set(record.turn_id, turn);
}

const visualObject = /hình ảnh|(?:^|[\s("'])ảnh(?:$|[\s,.)"'?!])|biểu đồ|sơ đồ|(?:^|\s)bảng(?:$|[\s,.)?!])|(?:^|[^\p{L}])(?:diagram|visual|graph|chart)(?:$|[^\p{L}])/iu;
const visualIntent = /giải thích|phân tích|tóm tắt|mô tả|là ai|là gì|ý nghĩa|so sánh/iu;
const unavailable = /không tìm thấy|không có (?:nội dung|thông tin|tài liệu|hình ảnh)|không thể (?:thấy|xem|đọc|xác định)|chưa có (?:nội dung|tài liệu)|cung cấp thêm/iu;
const technical = /\bcode\b|\blỗi\b|\berror\b|\bbug\b|\bapi\b|cài đặt|\binstall\b|\bgithub\b|\bterminal\b|\bdeploy\b|\btoken\b|\bkey\b|chạy (?:file|mã|lệnh)/iu;
const concept = /tóm tắt|giải thích|khái niệm|ví dụ|so sánh|hiểu|là gì|như thế nào/iu;

const completed = [...turns.values()].filter((turn) => turn.student && turn.tutor && turn.student.turn_status === "completed");
const directQuestion = (turn) => turn.student.content.split("\n").at(-1).trim();
const visual = completed.filter((turn) => visualObject.test(directQuestion(turn)) && visualIntent.test(directQuestion(turn)));
const visualFailures = visual.filter((turn) => unavailable.test(turn.tutor.content));
const technicalTurns = completed.filter((turn) => technical.test(directQuestion(turn)));
const conceptTurns = completed.filter((turn) => concept.test(directQuestion(turn)));
const unavailableReplies = completed.filter((turn) => unavailable.test(turn.tutor.content));
const downRated = completed.filter((turn) => turn.tutor.rating === "down");
const users = new Set(completed.map((turn) => turn.student.user_id));
const visualUsers = new Set(visual.map((turn) => turn.student.user_id));
const technicalUsers = new Set(technicalTurns.map((turn) => turn.student.user_id));
const conceptUsers = new Set(conceptTurns.map((turn) => turn.student.user_id));

console.log(JSON.stringify({
  records: records.length,
  completedTurns: completed.length,
  conversations: new Set(completed.map((turn) => turn.conversation_id)).size,
  users: users.size,
  visualRegionRequests: visual.length,
  visualRegionUsers: visualUsers.size,
  visualContextFailures: visualFailures.length,
  technicalRequests: technicalTurns.length,
  technicalUsers: technicalUsers.size,
  conceptExplanationRequests: conceptTurns.length,
  conceptExplanationUsers: conceptUsers.size,
  unavailableReplies: unavailableReplies.length,
  downRatedTurns: downRated.length,
  visualCandidates: visual.map((turn) => ({
    conversation_id: turn.conversation_id,
    turn_id: turn.turn_id,
    student: directQuestion(turn),
  })),
  visualFailures: visualFailures.map(({ conversation_id, turn_id, student, tutor }) => ({
    conversation_id,
    turn_id,
    student: student.content,
    tutor: tutor.content,
  })),
}, null, 2));

function parseCsv(text) {
  const output = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      output.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }
  if (field || row.length) {
    row.push(field.replace(/\r$/, ""));
    output.push(row);
  }
  return output;
}
