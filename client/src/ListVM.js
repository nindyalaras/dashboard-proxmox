import React, { useState, useEffect } from "react";
import { Card, Button, Spinner, Table, Alert } from "react-bootstrap";

function parseVMList(rawText) {
  if (!rawText) return [];
  return rawText
    .split('\n')
    .map(line => {
      const match = line.match(/VM_INFO: (\d+) - (running|stopped) - (.+)/);
      if (!match) return null;
      // Bersihkan trailing newline dan tanda kutip di akhir
      const cleanIp = match[3].replace(/\\n"?$/, '').replace(/"$/, '').trim();
      return {
        vmid: match[1],
        status: match[2],
        ip: cleanIp
      };
    })
    .filter(Boolean);
}

function ListVM() {
  const [vmList, setVmList] = useState([]);
  const [rawText, setRawText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const handleList = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch("http://localhost:8091/api/list");
      const data = await res.json();
      if (res.ok) {
        const regex = /VM_INFO: \d+ - (running|stopped) - .*/g;
        const lines = data.output.match(regex)?.join('\n') || '';
        setRawText(lines);
        setVmList(parseVMList(lines));
      } else {
        setError(`Gagal mengambil data VM: ${data.error}`);
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
    }
    setLoading(false);
  };

  useEffect(() => {
    handleList();
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(120deg, #d1c4e9 0%, #e1bee7 100%)",
        padding: 16,
      }}
    >
      <Card className="shadow-lg p-4" style={{ borderRadius: "1.5rem", width: "100%", maxWidth: 550 }}>
        <Card.Body>
          <Card.Title className="mb-3 text-center" style={{ fontWeight: 700, fontSize: "2rem", color: "#3949ab" }}>
            List VM Proxmox
          </Card.Title>
          <div className="d-flex justify-content-end mb-3">
            <Button variant="outline-primary" size="sm" onClick={handleList} disabled={loading}>
              {loading ? <Spinner animation="border" size="sm" /> : "Refresh List"}
            </Button>
          </div>
          {error && <Alert variant="danger">{error}</Alert>}

          {loading ? (
            <div className="text-center my-4">
              <Spinner animation="border" variant="primary" />
              <div className="mt-2">Mengambil daftar VM...</div>
            </div>
          ) : (
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th style={{ width: 90 }}>VM ID</th>
                  <th>Status</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {vmList.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center text-muted">Tidak ada VM ditemukan</td>
                  </tr>
                ) : (
                  vmList.map((vm, idx) => (
                    <tr key={idx}>
                      <td>{vm.vmid}</td>
                      <td>
                        <span
                          style={{
                            fontWeight: 600,
                            color: vm.status === "running" ? "#43a047" : "#fbc02d",
                          }}
                        >
                          {vm.status}
                        </span>
                      </td>
                      <td>
                        {vm.status === "running" && !["VM is off", "No IP or guest agent not active"].includes(vm.ip)
                          ? vm.ip
                          : <span className="text-muted" style={{ fontStyle: "italic" }}>{vm.ip}</span>
                        }
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          )}

          <div className="mt-2 text-end">
            <small style={{ color: "#888" }}>Last update: {new Date().toLocaleString()}</small>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}

export default ListVM;
