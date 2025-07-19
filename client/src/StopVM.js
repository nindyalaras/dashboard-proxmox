// src/StopVM.js
import React, { useState } from "react";
import { Card, Row, Col, Button, Form, Alert, Spinner } from "react-bootstrap";
import { BsPower } from "react-icons/bs";  // <--- hanya BsPower

function StopVM() {
  const [vmStopIds, setVmStopIds] = useState('');
  const [stopMessage, setStopMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Stop Multiple VMs
  const handleStopVMs = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStopMessage('Memproses stop VM...');

    const cleaned = vmStopIds.replace(/[^\d, ]+/g, '');
    const rawArr = cleaned.split(/[, ]+/).map(s => s.trim()).filter(Boolean);
    const idArray = rawArr.length === 0 ? [] : rawArr.map(Number).filter(n => !isNaN(n));

    if (idArray.length === 0) {
      setStopMessage('Tidak ada VM yang diminta untuk stop');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('http://localhost:8091/api/stop-vms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vm_ids: idArray }),
      });

      const text = await res.text();
      try {
        const data = JSON.parse(text);

        if (Array.isArray(data)) {
          const summary = data
            .sort((a, b) => a.vmid - b.vmid)
            .map(d => (!d.success ? `VM ${d.vmid} Gagal: ${d.message}` : `VM ${d.vmid} Berhasil: ${d.message}`))
            .join('\n');
          setStopMessage(summary);
        } else {
          setStopMessage(`Respon tidak dikenali: ${text}`);
        }
      } catch (e) {
        setStopMessage(`Respon bukan JSON: ${text}`);
      }
    } catch (err) {
      setStopMessage(`Error: ${err.message}`);
    }
    setLoading(false);
  };

  // Bulk Stop All VMs
  const handleBulkStop = async () => {
    setLoading(true);
    setStopMessage('Stop semua VM...');

    try {
      const res = await fetch('http://localhost:8091/api/stop-all-vms', {
        method: 'POST',
      });

      const text = await res.text();
      try {
        const data = JSON.parse(text);

        if (Array.isArray(data)) {
          const summary = data.map(d => {
            if (d.message.includes('sudah dalam keadaan stopped')) {
              return `VM ${d.vmid} ❌: ${d.message}`;
            } else {
              return `VM ${d.vmid} ${d.success ? '✔️' : '❌'}: ${d.message}`;
            }
          }).join('\n');
          setStopMessage(summary);
        } else if (data.message) {
          setStopMessage(data.message);
        } else {
          setStopMessage('Respon tidak dikenali');
        }
      } catch (e) {
        setStopMessage(`Respon bukan JSON: ${text}`);
      }
    } catch (err) {
      setStopMessage(`Error: ${err.message}`);
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
          {/* ========== STOP MULTIPLE VMS ========== */}
          <Col md={6}>
            <Card className="shadow border-0 h-100" style={{ borderRadius: 18 }}>
              <Card.Body>
                <div className="d-flex align-items-center mb-2">
                  <BsPower style={{ fontSize: 28, color: "#e53935" }} />
                  <Card.Title className="mb-0 ms-2" style={{ fontWeight: 700, fontSize: 20 }}>
                    Stop Banyak VM
                  </Card.Title>
                </div>
                <Form onSubmit={handleStopVMs}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">
                      Masukkan VM ID (pisahkan koma/spasi)
                    </Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Contoh: 101, 102, 103"
                      value={vmStopIds}
                      onChange={(e) => setVmStopIds(e.target.value)}
                    />
                  </Form.Group>
                  <Button
                    type="submit"
                    variant="danger"
                    className="w-100 fw-bold"
                    disabled={loading}
                  >
                    {loading ? <Spinner animation="border" size="sm" /> : <BsPower className="me-1" />}
                    Stop VMs
                  </Button>
                </Form>
              </Card.Body>
            </Card>
          </Col>

          {/* ========== BULK STOP ALL ========== */}
          <Col md={6}>
            <Card className="shadow border-0 h-100" style={{ borderRadius: 18 }}>
              <Card.Body>
                <div className="d-flex align-items-center mb-2">
                  {/* Pakai BsPower juga, beda warna aja */}
                  <BsPower style={{ fontSize: 28, color: "#ff7043" }} />
                  <Card.Title className="mb-0 ms-2" style={{ fontWeight: 700, fontSize: 20 }}>
                    Bulk Stop Semua VM
                  </Card.Title>
                </div>
                <Button
                  variant="warning"
                  className="w-100 fw-bold mb-3"
                  onClick={handleBulkStop}
                  disabled={loading}
                >
                  {loading ? <Spinner animation="border" size="sm" /> : <BsPower className="me-1" />}
                  Bulk Stop Semua
                </Button>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* STATUS */}
        <div className="mt-4">
          {stopMessage && (
            <Alert
              variant={stopMessage.toLowerCase().includes("gagal") || stopMessage.toLowerCase().includes("error") ? "danger" : "info"}
              style={{ borderRadius: 12, fontWeight: 500, fontSize: 16, whiteSpace: "pre-line" }}
            >
              {stopMessage}
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
}

export default StopVM;

