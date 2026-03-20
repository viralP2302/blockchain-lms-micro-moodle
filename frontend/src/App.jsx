import React, { useState, useEffect } from 'react';
import './App.css';

const BACKEND_URL = "http://localhost:3000";

// Hardhat predefined test accounts
const accounts = {
  teacher: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  student1: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  student2: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"
};

function App() {
  const [activeTab, setActiveTab] = useState('student');
  const [statusMsg, setStatusMsg] = useState(null);

  const showStatus = (msg, type = 'success') => {
    setStatusMsg({ text: msg, type });
    setTimeout(() => setStatusMsg(null), 5000);
  };

  return (
    <div className="app-container">
      <div className="header">
        <h1>MicroMoodle</h1>
        <p>Decentralized LMS powered by Ethereum</p>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${activeTab === 'student' ? 'active' : ''}`} onClick={() => setActiveTab('student')}>Student Dashboard</button>
        <button className={`tab-btn ${activeTab === 'teacher' ? 'active' : ''}`} onClick={() => setActiveTab('teacher')}>Teacher Dashboard</button>
        <button className={`tab-btn ${activeTab === 'verify' ? 'active' : ''}`} onClick={() => setActiveTab('verify')}>Verify Document</button>
      </div>

      {statusMsg && (
        <div className={`status-msg ${statusMsg.type}`}>
          {statusMsg.text}
        </div>
      )}

      {activeTab === 'student' && <StudentView showStatus={showStatus} />}
      {activeTab === 'teacher' && <TeacherView showStatus={showStatus} />}
      {activeTab === 'verify' && <VerifyView showStatus={showStatus} />}
    </div>
  );
}

function StudentView({ showStatus }) {
  const [studentAddress, setStudentAddress] = useState(accounts.student1);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submission, setSubmission] = useState(null);
  const [grade, setGrade] = useState(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeText, setDisputeText] = useState("");
  const [disputeLoading, setDisputeLoading] = useState(false);

  useEffect(() => {
    fetchSubmissionData();
  }, [studentAddress]);

  const fetchSubmissionData = async () => {
    try {
      const subRes = await fetch(`${BACKEND_URL}/submission/${studentAddress}`);
      if (subRes.ok) {
        setSubmission(await subRes.json());
      } else {
        setSubmission(null);
      }

      const gradeRes = await fetch(`${BACKEND_URL}/grade/${studentAddress}`);
      if (gradeRes.ok) {
        setGrade(await gradeRes.json());
      } else {
        setGrade(null);
      }

      const disputeRes = await fetch(`${BACKEND_URL}/dispute/${studentAddress}`);
      if (disputeRes.ok) {
        const data = await disputeRes.json();
        setDisputeReason(data.reason || "");
      } else {
        setDisputeReason("");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return showStatus("Please select a file first", "error");

    setLoading(true);
    const formData = new FormData();
    formData.append("assignment", file);
    formData.append("studentAddress", studentAddress);

    try {
      const res = await fetch(`${BACKEND_URL}/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (res.ok) {
        showStatus(`Success! Tx Hash: ${data.txHash}`);
        fetchSubmissionData();
      } else {
        showStatus(`Error: ${data.error}`, "error");
      }
    } catch (e) {
      showStatus(`Error: ${e.message}`, "error");
    }
    setLoading(false);
  };

  const handleDispute = async (e) => {
    e.preventDefault();
    if (!disputeText) return;
    setDisputeLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/dispute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentAddress, reason: disputeText }),
      });
      const data = await res.json();
      if (res.ok) {
        showStatus(`Dispute successfully logged! Tx Hash: ${data.txHash}`);
        setDisputeText("");
        fetchSubmissionData();
      } else {
        showStatus(`Error: ${data.error}`, "error");
      }
    } catch (e) {
      showStatus(`Error: ${e.message}`, "error");
    }
    setDisputeLoading(false);
  };

  return (
    <div className="section-container">
      <h2>Student Dashboard</h2>
      <div className="form-group">
        <label>Select Student Wallet</label>
        <select value={studentAddress} onChange={e => setStudentAddress(e.target.value)}>
          <option value={accounts.student1}>Student 1: {accounts.student1}</option>
          <option value={accounts.student2}>Student 2: {accounts.student2}</option>
        </select>
      </div>

      <div className="data-card">
        <h4>Current Status</h4>
        <p><small style={{color: "green"}}>Status: <b>Enrolled</b></small></p>
        {submission ? (
          <div>
            <p><strong>Submitted File Hash:</strong> <span className="hash-text">{submission.fileHash}</span></p>
            <p><strong>Timestamp:</strong> {new Date(Number(submission.timestamp) * 1000).toLocaleString()}</p>
            <p><strong>Grade:</strong> {grade && grade.graded ? grade.grade + " Marks" : "Not Graded Yet"}</p>
            {grade && grade.graded && grade.feedback && <p><strong>Teacher Feedback (Off-Chain):</strong> <br/><span style={{fontStyle: "italic", color: "#555"}}>{grade.feedback}</span></p>}
          </div>
        ) : (
          <p>No submission found.</p>
        )}
      </div>

      {grade && grade.graded && (
        <div className="data-card" style={{marginTop: "15px", borderLeft: "4px solid #f39c12"}}>
          <h4>Grade Appeal / Dispute Workflow</h4>
          {disputeReason ? (
            <p><strong>Active Dispute Logged On-Chain:</strong> {disputeReason}</p>
          ) : (
            <form onSubmit={handleDispute}>
              <div className="form-group" style={{marginBottom: "10px"}}>
                <input type="text" placeholder="State reason for grade dispute..." value={disputeText} onChange={e => setDisputeText(e.target.value)} required />
              </div>
              <button type="submit" className="btn-submit" style={{backgroundColor: "#f39c12", padding: "8px"}} disabled={disputeLoading}>
                {disputeLoading ? "Logging on-chain..." : "File Official Dispute"}
              </button>
            </form>
          )}
        </div>
      )}

      <h3>Submit New Assignment</h3>
      <form onSubmit={handleUpload}>
        <div className="form-group">
          <input type="file" onChange={e => setFile(e.target.files[0])} required />
        </div>
        <button type="submit" className="btn-submit" disabled={loading}>
          {loading ? "Submitting to Blockchain..." : "Submit Assignment"}
        </button>
      </form>
    </div>
  );
}

function TeacherView({ showStatus }) {
  const [submissionsList, setSubmissionsList] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [marks, setMarks] = useState('');
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSubmissions();
  }, []); // Fetch on mount

  const fetchSubmissions = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/submissions`);
      if (res.ok) {
        const data = await res.json();
        setSubmissionsList(data);
        if (data.length > 0 && !selectedStudent) {
            setSelectedStudent(data[0].address);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleGrade = async (e) => {
    e.preventDefault();
    if (!selectedStudent || !marks) return showStatus("Fill all fields", "error");

    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherAddress: accounts.teacher,
          studentAddress: selectedStudent,
          marks: Number(marks),
          feedback: feedback
        }),
      });
      const data = await res.json();

      if (res.ok) {
        showStatus(`Grade Assigned! Tx Hash: ${data.txHash}`);
      } else {
        showStatus(`Error: ${data.error}`, "error");
      }
    } catch (e) {
      showStatus(`Error: ${e.message}`, "error");
    }
    setLoading(false);
  };

  return (
    <div className="section-container">
      <h2>Teacher Dashboard</h2>
      <div className="form-group">
        <label>Teacher Wallet (Active)</label>
        <input type="text" value={accounts.teacher} disabled />
      </div>

      <div className="data-card" style={{marginBottom: "20px"}}>
        <h4>All Submissions</h4>
        <button className="tab-btn" onClick={fetchSubmissions} style={{padding: "5px 10px", margin: "10px 0"}}>Refresh</button>
        {submissionsList.length === 0 ? <p>No submissions yet.</p> : (
          submissionsList.map((sub, i) => (
            <div key={i} className="submission-card">
              <strong>Student:</strong> {sub.address} <br/>
              <strong>Hash:</strong> <span className="hash-text">{sub.fileHash.substring(0, 20)}...</span> <br/>
              <strong>Time:</strong> {new Date(Number(sub.timestamp) * 1000).toLocaleString()} <br/>
              {sub.dispute && (
                  <div style={{marginTop: "5px", padding: "5px", backgroundColor: "#fff3cd", borderLeft: "3px solid #ffc107", fontSize: "0.9em"}}>
                      <strong>🚨 Dispute Logged:</strong> {sub.dispute}
                  </div>
              )}
            </div>
          ))
        )}
      </div>

      <h3>Assign Grade</h3>
      <form onSubmit={handleGrade}>
        <div className="form-group">
          <label>Student to Grade</label>
          <select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)} required>
            <option value="">-- Select Student --</option>
            {submissionsList.map((sub, i) => (
              <option key={i} value={sub.address}>{sub.address}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Marks</label>
          <input type="number" min="0" max="100" value={marks} onChange={e => setMarks(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Feedback (Off-Chain)</label>
          <textarea rows="3" value={feedback} onChange={e => setFeedback(e.target.value)} style={{width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e0", boxSizing: "border-box", marginTop: "5px"}} placeholder="Great job solving the assignment" />
        </div>
        <button type="submit" className="btn-submit" disabled={loading}>
          {loading ? "Assigning Grade on-chain..." : "Assign Grade"}
        </button>
      </form>
    </div>
  );
}

function VerifyView({ showStatus }) {
  const [file, setFile] = useState(null);
  const [hashResult, setHashResult] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!file) return showStatus("Select a file to verify", "error");

    setLoading(true);
    const formData = new FormData();
    formData.append("assignment", file);

    try {
      const res = await fetch(`${BACKEND_URL}/verify`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setHashResult(data.fileHash);
        showStatus("File processed successfully!");
      } else {
        showStatus(`Error: ${data.error}`, "error");
      }
    } catch (e) {
      showStatus(`Error: ${e.message}`, "error");
    }
    setLoading(false);
  };

  return (
    <div className="section-container">
      <h2>Verify Document</h2>
      <p>Upload a document to generate its Keccak256 hash. Compare it against the blockchain status.</p>
      
      <form onSubmit={handleVerify}>
        <div className="form-group">
          <input type="file" onChange={e => setFile(e.target.files[0])} required />
        </div>
        <button type="submit" className="btn-submit" style={{backgroundColor: "#8e44ad"}} disabled={loading}>
          {loading ? "Generating Hash..." : "Generate Hash"}
        </button>
      </form>

      {hashResult && (
        <div className="data-card" style={{marginTop: "20px"}}>
          <h4>Generated Hash</h4>
          <p className="hash-text">{hashResult}</p>
          <small>Check this against the student's submission hash to ensure it's not tampered with.</small>
        </div>
      )}
    </div>
  );
}

export default App;
