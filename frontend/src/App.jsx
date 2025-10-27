/* SmartAssessment - App.jsx (Tiếng Việt demo)
   Frontend demo. Tương tự nội dung mẫu đã tạo trên canvas. */
import React, { useState } from "react";

// Simple Router (mini)
function Router({ route, children }) {
  return children.find(c => c.props.path === route) || null;
}

function App() {
  const [route, setRoute] = useState("/");
  const [currentExam, setCurrentExam] = useState(null);
  const [results, setResults] = useState(null);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <header className="bg-blue-600 text-white p-4 shadow">
        <div className="container mx-auto flex items-center justify-between">
          <h1 className="text-xl font-semibold">Smart Assessment — Đánh giá năng lực số</h1>
          <nav className="space-x-4">
            <button onClick={() => setRoute("/")}>Trang chủ</button>
            <button onClick={() => setRoute("/exam")}>Làm bài</button>
            <button onClick={() => setRoute("/results")}>Kết quả</button>
            <button onClick={() => setRoute("/admin")}>Quản trị</button>
          </nav>
        </div>
      </header>

      <main className="container mx-auto p-6">
        <Router route={route}>
          <Home path="/" onStart={(exam) => { setCurrentExam(exam); setRoute('/exam'); }} />
          <Exam path="/exam" exam={currentExam} onSubmit={(r) => { setResults(r); setRoute('/results'); }} />
          <Results path="/results" results={results} />
          <Admin path="/admin" />
        </Router>
      </main>

      <footer className="text-center p-4 text-sm text-gray-600">
        © 2025 Smart Assessment — Demo giao diện tiếng Việt
      </footer>
    </div>
  );
}

function Home({ onStart }) {
  const sampleExams = [
    { id: 1, title: "An toàn & Bảo mật (THCS)", questions: [] },
    { id: 2, title: "Công cụ số cơ bản (THCS)", questions: [] }
  ];

  return (
    <section>
      <h2 className="text-2xl font-bold mb-3">Xin chào!</h2>
      <p className="mb-4">Chọn đề kiểm tra mẫu hoặc yêu cầu hệ thống sinh câu hỏi bằng AI.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sampleExams.map(ex => (
          <div key={ex.id} className="p-4 bg-white rounded shadow">
            <h3 className="font-semibold">{ex.title}</h3>
            <p className="text-sm text-gray-600">Số lượng câu: 10 (mẫu)</p>
            <div className="mt-3">
              <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={() => onStart(ex)}>Làm đề mẫu</button>
            </div>
          </div>
        ))}

        <div className="p-4 bg-white rounded shadow">
          <h3 className="font-semibold">Sinh câu hỏi bằng AI</h3>
          <p className="text-sm text-gray-600">Mô tả chủ đề, ví dụ: "An toàn thông tin cho học sinh THCS"</p>
          <AIQuestionGenerator onStart={onStart} />
        </div>
      </div>

    </section>
  );
}

function AIQuestionGenerator({ onStart }) {
  const [prompt, setPrompt] = useState("An toàn thông tin cho học sinh THCS");
  const [loading, setLoading] = useState(false);
  const [generatedExam, setGeneratedExam] = useState(null);

  async function handleGenerate() {
    setLoading(true);
    // Call backend API to generate real questions:
    try {
      const resp = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, n_questions: 10 })
      });
      const data = await resp.json();
      // Expected { title, questions: [{id,text,choices,answer}] }
      setGeneratedExam(data);
    } catch (e) {
      // Fallback demo
      await new Promise(r => setTimeout(r, 700));
      const demo = {
        id: 999,
        title: `AI: ${prompt}`,
        questions: [
          { id: 1, text: 'Mật khẩu nên có tối thiểu bao nhiêu ký tự?', choices: ['4','6','8','10'], answer: 2 },
          { id: 2, text: 'Không chia sẻ gì với người lạ?', choices: ['Số điện thoại','Mật khẩu','Cả hai','Không chia sẻ gì'], answer: 2 }
        ]
      };
      setGeneratedExam(demo);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <textarea value={prompt} onChange={e => setPrompt(e.target.value)} className="w-full p-2 border rounded mb-2" rows={3} />
      <div className="flex gap-2">
        <button className="px-3 py-1 bg-green-600 text-white rounded" onClick={handleGenerate} disabled={loading}>{loading ? 'Đang tạo...' : 'Tạo câu hỏi'}</button>
        {generatedExam && <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={() => onStart(generatedExam)}>Làm đề vừa tạo</button>}
      </div>

      <p className="mt-2 text-sm text-gray-500">Ghi chú: để thực sự sinh bằng AI, backend cần gọi OpenAI và trả về định dạng JSON.</p>
    </div>
  );
}

function Exam({ exam, onSubmit }) {
  const defaultExam = exam || {
    id: 0, title: 'Đề mẫu nhanh', questions: [
      { id: 1, text: 'HTML là viết tắt của?', choices: ['HyperText Markup Language','Home Tool Markup','Hyperlink Text Markup','None'], answer: 0 },
      { id: 2, text: 'CSS dùng để?', choices: ['Cấu trúc nội dung','Trang trí giao diện','Lưu trữ dữ liệu','Gửi email'], answer: 1 }
    ]
  };

  const [answers, setAnswers] = useState({});
  const qlist = exam ? (exam.questions.length ? exam.questions : defaultExam.questions) : defaultExam.questions;

  function choose(qid, idx) {
    setAnswers(prev => ({ ...prev, [qid]: idx }));
  }

  async function handleSubmit() {
    let correct = 0;
    qlist.forEach(q => { if (answers[q.id] === q.answer) correct++; });
    const score = Math.round((correct / qlist.length) * 100);
    const result = { score, total: qlist.length, correct };
    // Save result to backend
    try {
      await fetch("/api/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exam_title: exam ? exam.title : defaultExam.title, result })
      });
    } catch (e) {
      // ignore
    }
    onSubmit(result);
  }

  return (
    <section>
      <h2 className="text-xl font-semibold mb-3">{exam ? exam.title : defaultExam.title}</h2>
      <div className="space-y-4">
        {qlist.map(q => (
          <div key={q.id} className="p-4 bg-white rounded shadow">
            <p className="font-medium">{q.text}</p>
            <div className="mt-2 grid gap-2">
              {q.choices.map((c, i) => (
                <label key={i} className={`block p-2 border rounded cursor-pointer ${answers[q.id]===i? 'border-blue-500 bg-blue-50':''}`}>
                  <input type="radio" name={`q-${q.id}`} checked={answers[q.id]===i} onChange={() => choose(q.id, i)} className="mr-2" /> {c}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={handleSubmit}>Nộp bài</button>
      </div>
    </section>
  );
}

function Results({ results }) {
  if (!results) return (
    <div className="p-6 bg-white rounded shadow">Chưa có kết quả. Hãy làm một bài kiểm tra trước.</div>
  );

  const level = results.score >= 80 ? 'Tốt' : results.score >= 50 ? 'Trung bình' : 'Cần cải thiện';

  return (
    <div className="p-4 bg-white rounded shadow">
      <h2 className="text-xl font-semibold mb-2">Kết quả</h2>
      <p>Điểm: <strong>{results.score}</strong>/100</p>
      <p>Số câu đúng: {results.correct}/{results.total}</p>
      <p>Mức năng lực: <strong>{level}</strong></p>

      <div className="mt-3">
        <h3 className="font-semibold">Gợi ý cải thiện</h3>
        <ul className="list-disc pl-6 mt-2 text-sm text-gray-700">
          <li>Nắm vững kiến thức cơ bản về an toàn thông tin.</li>
          <li>Thực hành đặt mật khẩu mạnh và không chia sẻ thông tin cá nhân.</li>
        </ul>
      </div>
    </div>
  );
}

function Admin() {
  const demo = [
    { name: 'Nguyễn Văn A', score: 85 },
    { name: 'Trần Thị B', score: 62 },
    { name: 'Lê Văn C', score: 40 }
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold mb-3">Trang Quản trị (mẫu)</h2>
      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-100"><tr><th className="p-2">Học sinh</th><th className="p-2">Điểm</th></tr></thead>
          <tbody>
            {demo.map((r,i) => (
              <tr key={i} className="border-t"><td className="p-2">{r.name}</td><td className="p-2">{r.score}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-sm text-gray-500">Gợi ý: Kết nối bảng này với API backend để lưu trữ thực tế và xuất báo cáo .xlsx hoặc .pdf.</p>
    </div>
  );
}

export default App;
