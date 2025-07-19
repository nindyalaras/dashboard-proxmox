// src/CloneVM.js
import React, { useState, useEffect } from "react";
import { Card, Button, Form, Alert, Spinner, Table } from "react-bootstrap";

function CloneVM() {
  const [templateId, setTemplateId] = useState("");
  const [vmCount, setVmCount] = useState("");
  const [message, setMessage] = useState("");
  const [newVmIds, setNewVmIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    fetch("http://localhost:8091/api/templates")
      .then((res) => res.json())
      .then((data) => setTemplates(data.templates || []))
      .catch(() => setTemplates([]));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("Cloning in progress...");
    setNewVmIds([]);
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8091/api/clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template_id: templateId, vm_count: vmCount }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("Clone berhasil!");
        const regex = /CLONED_VM: (vm-\d+)/g;
        const ids = [...data.output.matchAll(regex)].map((match) => match[1]);
        setNewVmIds(ids);
      } else {
        setMessage(`Clone gagal:\n${data.error || "Unknown error"}`);
      }
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    }
    setLoading(false);
  };

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
      <Card className="shadow-lg p-4" style={{ borderRadius: "1.5rem", width: "100%", maxWidth: 470 }}>
        <Card.Body>
          <Card.Title className="mb-4 text-center" style={{ fontWeight: 700, fontSize: "2rem", color: "#8247e5" }}>
            Clone Proxmox VM
          </Card.Title>

          {/* Tabel Template */}
          <div style={{ marginBottom: 20 }}>
            <strong>Template Tersedia:</strong>
            {templates.length === 0 ? (
              <div style={{ fontSize: 15, color: "#888" }}>Tidak ada template ditemukan</div>
            ) : (
              <Table size="sm" striped bordered hover style={{ background: "#fafafa", marginTop: 8 }}>
                <thead>
                  <tr>
                    <th>VMID</th>
                    <th>Nama</th>
                    <th>OS</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((t) => (
                    <tr key={t.vmid}>
                      <td>{t.vmid}</td>
                      <td>{t.name}</td>
                      <td>{t.ostype}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </div>

          {/* Form Clone */}
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Template VM ID</Form.Label>
              <Form.Control
                type="text"
                placeholder="ex: 101"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                required
                autoFocus
              />
            </Form.Group>
            <Form.Group className="mb-4">
              <Form.Label>Jumlah VM yang ingin dibuat</Form.Label>
              <Form.Control
                type="number"
                min="1"
                placeholder="ex: 2"
                value={vmCount}
                onChange={(e) => setVmCount(e.target.value)}
                required
              />
            </Form.Group>
            <div className="d-grid gap-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={loading}
                style={{
                  background: "linear-gradient(90deg, #a18cd1 0%, #fbc2eb 100%)",
                  border: "none",
                  fontWeight: 600,
                }}
              >
                {loading ? <Spinner animation="border" size="sm" /> : "Clone VM"}
              </Button>
            </div>
          </Form>
          {/* Notifikasi */}
          {message && (
            <Alert
              variant={message.includes("berhasil") ? "success" : "danger"}
              className="mt-4 text-center"
            >
              {message}
            </Alert>
          )}
          {newVmIds.length > 0 && (
            <div className="mt-3">
              <div style={{ fontWeight: 600, marginBottom: 6 }}>VM ID yang berhasil dibuat:</div>
              <ul style={{ fontSize: 18, color: "#444" }}>
                {newVmIds.map((id, idx) => (
                  <li key={idx}>{id}</li>
                ))}
              </ul>
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}

export default CloneVM;
