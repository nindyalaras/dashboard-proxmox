// src/StartVM.js
import React, { useState } from "react";
import { Card, Row, Col, Button, Form, Alert, Spinner } from "react-bootstrap";
import { BsPlayFill, BsPlayCircle } from "react-icons/bs";

function StartVM() {
  const [vmStartIds, setVmStartIds] = useState('');
  const [startMessage, setStartMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Handler Start Multiple VM by ID
  const handleStartVMs = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStartMessage('Memulai VM...');

    const cleaned = vmStartIds.replace(/[^\d, ]+/g, '');
    const rawArr = cleaned.split(/[, ]+/).map(s => s.trim()).filter(Boolean);
    const idArray = rawArr.length === 0 ? [] : rawArr.map(Number).filter(n => !isNaN(n));

    if (idArray.length === 0) {
      setStartMessage('Tidak ada VM yang diminta untuk start');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('http://localhost:8091/api/start-vms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vm_ids: idArray })
      });

      const data = await res.json();

      if (Array.isArray(data)) {
        const summary = data
          .sort((a, b) => a.vmid - b.vmid)
          .map(d => {
            if (d.success) {
              return `VM ${d.vmid}: Berhasil - ${d.message || d.output}`;
            } else {
              return `VM ${d.vmid}: Gagal - ${d.message || d.output}`;
            }
          })
          .join('\n');
        setStartMessage(summary);
      } else if (data.message) {
        setStartMessage(data.message);
      } else {
        setStartMessage(`Respon tidak dikenali: ${JSON.stringify(data, null, 2)}`);
      }
    } catch (err) {
      setStartMessage(`Error: ${err.message}`);
    }
    setLoading(false);
  };

  // Handler Bulk Start All VM
  const handleBulkStart = async () => {
    setLoading(true);
    setStartMessage('Memulai semua VM yang mati...');

    try {
      const res = await fetch('http://localhost:8091/api/start-all-vms', {
        method: 'POST'
      });

      const data = await res.json();

      if (Array.isArray(data)) {
        const allSkipped = data.every(d => d.skipped);
        if (allSkipped && data.length > 0) {
          setStartMessage('Semua VM sudah menyala');
          setLoading(false);
          return;
        }
        const summary = data
          .sort((a, b) => a.vmid - b.vmid)
          .map(d => {
            if (d.skipped) {
              return `VM ${d.vmid} SKIPPED: ${d.message}`;
            } else if (d.success) {
              return `VM ${d.vmid} STARTED: ${d.message}`;
            } else {
              return `VM ${d.vmid} FAILED: ${d.message}`;
            }
          })
          .join('\n');
        setStartMessage(summary);
      } else if (data.message) {
        setStartMessage(data.message);
      } else {
        setStartMessage(`Respon tidak dikenali: ${JSON.stringify(data, null, 2)}`);
      }
    } catch (err) {
      setStartMessage(`Error: ${err.message}`);
    }
    setLoading(false);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        minWidth: "100vw",
        background: "linear-gradient(120deg, #d1c4e9 0%, #e1bee7 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
      }}
    >
      <div style={{ maxWidth: 820, width: "100%", margin: "0 auto", padding: 32 }}>
        <Row className="g-4">
          {/* ========== MANUAL START MANY VMS ========== */}
          <Col md={6}>
            <Card className="shadow border-0 h-100" style={{ borderRadius: 18 }}>
              <Card.Body>
                <div className="d-flex align-items-center mb-2">
                  <BsPlayFill style={{ fontSize: 28, color: "#512da8" }} />
                  <Card.Title className="mb-0 ms-2" style={{ fontWeight: 700, fontSize: 20 }}>
                    Start Banyak VM
                  </Card.Title>
                </div>
                <Form onSubmit={handleStartVMs}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">
                      Masukkan VM ID (pisahkan koma/spasi)
                    </Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Contoh: 101, 102, 103"
                      value={vmStartIds}
                      onChange={(e) => setVmStartIds(e.target.value)}
                    />
                  </Form.Group>
                  <Button
                    type="submit"
                    variant="success"
                    className="w-100 fw-bold"
                    disabled={loading}
                  >
                    {loading ? <Spinner animation="border" size="sm" /> : <BsPlayFill className="me-1" />}
                    Start VMs
                  </Button>
                </Form>
              </Card.Body>
            </Card>
          </Col>

          {/* ========== BULK START ALL ========== */}
          <Col md={6}>
            <Card className="shadow border-0 h-100" style={{ borderRadius: 18 }}>
              <Card.Body>
                <div className="d-flex align-items-center mb-2">
                  <BsPlayCircle style={{ fontSize: 28, color: "#388e3c" }} />
                  <Card.Title className="mb-0 ms-2" style={{ fontWeight: 700, fontSize: 20 }}>
                    Bulk Start Semua VM
                  </Card.Title>
                </div>
                <Button
                  variant="primary"
                  className="w-100 fw-bold mb-3"
                  onClick={handleBulkStart}
                  disabled={loading}
                >
                  {loading ? <Spinner animation="border" size="sm" /> : <BsPlayCircle className="me-1" />}
                  Bulk Start Semua
                </Button>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* STATUS */}
        <div className="mt-4">
          {startMessage && (
            <Alert
              variant={startMessage.toLowerCase().includes("gagal") || startMessage.toLowerCase().includes("error") ? "danger" : "info"}
              style={{ borderRadius: 12, fontWeight: 500, fontSize: 16, whiteSpace: "pre-line" }}
            >
              {startMessage}
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
}

export default StartVM;
