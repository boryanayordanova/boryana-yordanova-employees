import "./App.css";
import React, { useState } from "react";

type EmployeeProject = {
  EmpID: number;
  ProjectID: number;
  DateFrom: Date;
  DateTo: Date;
};

type PairProjectDays = {
  emp1: number;
  emp2: number;
  projectId: number;
  totalDaysWorked: number;
};

// Supported date formats regex patterns and parsers
const datePatterns: {
  regex: RegExp;
  parser: (dateStr: string) => Date | null;
}[] = [
  {
    regex: /^\d{4}-\d{2}-\d{2}$/, // yyyy-MM-dd
    parser: (dateStr) => {
      const parts = dateStr.split("-");
      return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    },
  },
  {
    regex: /^\d{2}\/\d{2}\/\d{4}$/, // MM/dd/yyyy
    parser: (dateStr) => {
      const parts = dateStr.split("/");
      return new Date(Number(parts[2]), Number(parts[0]) - 1, Number(parts[1]));
    },
  },
  {
    regex: /^\d{2}-\d{2}-\d{4}$/, // dd-MM-yyyy
    parser: (dateStr) => {
      const parts = dateStr.split("-");
      return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
    },
  },
  {
    regex: /^\d{2}\/\d{2}\/\d{4}$/, // dd/MM/yyyy
    parser: (dateStr) => {
      const parts = dateStr.split("/");
      return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
    },
  },
  // Add more patterns if needed
];

function parseDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.toLowerCase() === "null") {
    return new Date(); // today
  }
  dateStr = dateStr.trim();
  for (const { regex, parser } of datePatterns) {
    if (regex.test(dateStr)) {
      const d = parser(dateStr);
      if (d !== null && !isNaN(d.getTime())) {
        return d;
      }
    }
  }
  // fallback to Date constructor
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function parseCSV(csvText: string): string[][] {
  const lines = csvText.split(/\r?\n/);
  const rows: string[][] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    // Simple CSV split by comma, no support for quoted commas
    const cols = line.split(",").map((col) => col.trim());
    rows.push(cols);
  }
  return rows;
}

function differenceInDays(date1: Date, date2: Date): number {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

function App() {
  const [pairs, setPairs] = useState<PairProjectDays[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fileUploaded, setFileUploaded] = useState(false);

  const processData = (data: string[][]) => {
    setError(null);
    const projects: EmployeeProject[] = [];
    for (const row of data) {
      if (row.length < 4) continue;
      const EmpID = Number(row[0]);
      const ProjectID = Number(row[1]);
      const DateFrom = parseDate(row[2]);
      const DateTo = parseDate(row[3]);
      if (isNaN(EmpID) || isNaN(ProjectID) || !DateFrom || !DateTo) {
        setError("Invalid data format in CSV.");
        setFileUploaded(false);
        return;
      }
      projects.push({ EmpID, ProjectID, DateFrom, DateTo });
    }

    const pairMap = new Map<string, PairProjectDays>();

    for (let i = 0; i < projects.length; i++) {
      for (let j = i + 1; j < projects.length; j++) {
        const p1 = projects[i];
        const p2 = projects[j];
        if (p1.ProjectID === p2.ProjectID && p1.EmpID !== p2.EmpID) {
          const start = p1.DateFrom > p2.DateFrom ? p1.DateFrom : p2.DateFrom;
          const end = p1.DateTo < p2.DateTo ? p1.DateTo : p2.DateTo;
          if (end >= start) {
            const days = differenceInDays(end, start) + 1;
            const emp1 = Math.min(p1.EmpID, p2.EmpID);
            const emp2 = Math.max(p1.EmpID, p2.EmpID);
            const projectId = p1.ProjectID;
            const key = `${emp1}-${emp2}-${projectId}`;
            if (pairMap.has(key)) {
              const existing = pairMap.get(key)!;
              existing.totalDaysWorked += days;
            } else {
              pairMap.set(key, {
                emp1,
                emp2,
                projectId,
                totalDaysWorked: days,
              });
            }
          }
        }
      }
    }

    console.log("Pairs:", Array.from(pairMap.values())); // Debug log

    setPairs(Array.from(pairMap.values()));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileUploaded(true);
    const reader = new FileReader();
    reader.onload = (event: ProgressEvent<FileReader>) => {
      const text = event.target?.result;
      if (typeof text === "string") {
        const data = parseCSV(text);
        processData(data);
      } else {
        setError("Failed to read file content.");
      }
    };
    reader.onerror = () => {
      setError("Error reading file.");
    };
    reader.readAsText(file);
  };

  return (
    <div className="main">
      <h1>Employee Project Pairs</h1>
      <input type="file" accept=".csv" onChange={handleFileUpload} />
      {error && (
        <p style={{ color: "#ef4444", marginBottom: "1rem" }}>{error}</p>
      )}

      {fileUploaded && (
        <>
          {pairs.length > 0 ? (
            <>
              <p>
                Pairs Found: <b>{pairs.length}</b>
              </p>
              <table>
                <thead>
                  <tr>
                    <th>Employee ID #1</th>
                    <th>Employee ID #2</th>
                    <th>Project ID</th>
                    <th>Days worked</th>
                  </tr>
                </thead>
                <tbody>
                  {pairs.map((pair) => (
                    <tr key={`${pair.emp1}-${pair.emp2}-${pair.projectId}`}>
                      <td>{pair.emp1}</td>
                      <td>{pair.emp2}</td>
                      <td>{pair.projectId}</td>
                      <td>{pair.totalDaysWorked}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p>None Pairs Found!</p>
          )}
        </>
      )}
      <footer>Boryana Yordanova</footer>
    </div>
  );
}

export default App;
