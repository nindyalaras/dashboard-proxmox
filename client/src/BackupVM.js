// src/BackupVM.js
import React, { useState, useEffect } from "react";
import { Card, Row, Col, Button, Form, Alert, Table, Spinner } from "react-bootstrap";
import { BsCloudArrowUp, BsCloudCheck, BsStopCircle, BsArrowClockwise } from "react-icons/bs";

function BackupVM() {
  const [backupIdsText, setBackupIdsText] = useState("");
  const [backupTime, setBackupTime] = useState("");
  const [backupMessage, setBackupMessage] = useState("");
  const [backupPreset, setBackupPreset] = useState("daily");

  const [backupAllTime, setBackupAllTime] = useState("");
  const [backupAllPreset, setBackupAllPreset] = useState("daily");

  const [allVmIds, setAllVmIds] = useState([]);

  const [backupSchedules, setBackupSchedules] = useState([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  // Fetch VM ID list for validation
  useEffect(() => {
    fetch("http://localhost:8091/api/list")
      .then((res) => res.json())
      .then((data) => {
        const regex = /VM_INFO: (\d+) -/g;
        let match, ids = [];
        while ((match = regex.exec(data.output)) !== null) {
          ids.push(Number(match[1]));
        }
        setAllVmIds(ids);
      })
      .catch(() => setAllVmIds([]));
  }, []);

  const presetsNeedTime = [
    "daily", "monday-friday", "every-saturday", "first-day-month", "first-day-year"
  ];

  // Fetch list jadwal backup (schedule)
  const fetchBackupSchedules = async () => {
    setLoadingSchedule(true);
    try {
      const res = await fetch("http://localhost:8091/api/list-schedule-backup");
      const data = await res.json();
      setBackupSchedules(data);
    } catch {
      setBackupSchedules([]);
    }
    setLoadingSchedule(false);
  };

  useEffect(() => {
    fetchBackupSchedules();
  }, []);

  // Backup Multiple
  const handleBackupSchedule = async (e) => {
    e.preventDefault();

    if (!backupIdsText.trim() || !backupPreset) {
      setBackupMessage("vm_ids dan preset required");
      return;
    }
    if (presetsNeedTime.includes(backupPreset) && !backupTime) {
      setBackupMessage("backup_time required untuk preset ini");
      return;
    }

    setBackupMessage("Menjadwalkan backup...");

    const rawIds = backupIdsText.split(/[, ]+/).map(s => s.trim()).filter(Boolean);
    const idArray = rawIds.filter(s => /^\d+$/.test(s)).map(Number);
    const invalidInputs = rawIds.filter(s => !/^\d+$/.test(s));

    let errorMsgArr = [];
    if (invalidInputs.length > 0) errorMsgArr.push("Input berikut bukan VM ID yang valid: " + invalidInputs.join(", "));
    const notFound = idArray.filter(id => !allVmIds.includes(id));
    if (notFound.length > 0) errorMsgArr.push("VM ID berikut tidak ditemukan: " + notFound.join(", "));
    if (errorMsgArr.length > 0) { setBackupMessage(errorMsgArr.join('\n')); return; }

    try {
      const res = await fetch("http://localhost:8091/api/schedule-backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vm_ids: idArray, preset: backupPreset, backup_time: backupTime }),
      });
      const data = await res.json();
      setBackupMessage(res.ok ? data.message : `Gagal set backup: ${data.error}`);
      fetchBackupSchedules(); // REFRESH SCHEDULE LIST
    } catch (err) {
      setBackupMessage(`Error: ${err.message}`);
    }
  };

  // Backup ALL
  const handleBackupAllVM = async (e) => {
    e?.preventDefault?.();
    setBackupMessage("Menjadwalkan backup all VM...");
    if (!backupAllPreset) { setBackupMessage("preset required"); return; }
    if (presetsNeedTime.includes(backupAllPreset) && !backupAllTime) {
      setBackupMessage("backup_time required untuk preset ini");
      return;
    }
    try {
      const res = await fetch("http://localhost:8091/api/backup-all-vm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset: backupAllPreset, backup_time: backupAllTime }),
      });
      const data = await res.json();
      setBackupMessage(res.ok ? data.message : `Gagal set backup all VM: ${data.error}`);
      fetchBackupSchedules(); // REFRESH SCHEDULE LIST
    } catch (err) {
      setBackupMessage(`Error: ${err.message}`);
    }
  };

  // Stop Backup
  const handleStopBackup = async () => {
    setBackupMessage("Menghentikan semua backup...");
    try {
      const res = await fetch("http://localhost:8091/api/stop-backup", { method: "POST" });
      const data = await res.json();
      setBackupMessage(res.ok ? data.message : `Gagal stop backup: ${data.error}`);
      setBackupSchedules([]); // CLEAR LIST
    } catch (err) {
      setBackupMessage(`Error: ${err.message}`);
    }
  };

  // Render
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
      <div style={{ maxWidth: 860, width: "100%", margin: "0 auto", padding: 32 }}>
        <Row className="g-4 mb-4">
          <Col md={12}>
            <Card className="shadow border-0" style={{ borderRadius: 18 }}>
              <Card.Body>
                <div className="d-flex align-items-center mb-2">
                  <BsArrowClockwise style={{ fontSize: 28, color: "#512da8" }} />
                  <Card.Title className="mb-0 ms-2" style={{ fontWeight: 700, fontSize: 20 }}>
                    List Penjadwalan Backup Aktif
                  </Card.Title>
                  <Button
                    variant="outline-primary"
                    className="ms-auto"
                    size="sm"
                    onClick={fetchBackupSchedules}
                    style={{ fontWeight: 600, borderRadius: 12 }}
                  >
                    Refresh List
                  </Button>
                </div>
                {loadingSchedule ? (
                  <div className="py-3 text-center"><Spinner animation="border" /></div>
                ) : backupSchedules.length === 0 ? (
                  <div className="text-center text-muted py-2">
                    Belum ada penjadwalan backup aktif.
                  </div>
                ) : (
                  <Table bordered hover responsive style={{ borderRadius: 10, overflow: "hidden" }}>
                    <thead>
                      <tr>
                        <th>VM ID</th>
                        <th>Preset</th>
                        <th>Jam Backup</th>
                        <th>Jenis</th>
                      </tr>
                    </thead>
                    <tbody>
                      {backupSchedules.map((sch, idx) => (
                        <tr key={idx}>
                          <td>
                            {sch.vm_ids === "ALL" ? (
                              <span className="fw-bold">ALL</span>
                            ) : Array.isArray(sch.vm_ids) ? sch.vm_ids.join(", ") : "-"}
                          </td>
                          <td>{sch.preset}</td>
                          <td>{sch.backup_time}</td>
                          <td>{sch.type === "all" ? "Backup ALL" : "Backup by VM ID"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
        <Row className="g-4">
          {/* Backup Multiple VM */}
          <Col md={6}>
            <Card className="shadow border-0 h-100" style={{ borderRadius: 18 }}>
              <Card.Body>
                <div className="d-flex align-items-center mb-2">
                  <BsCloudArrowUp style={{ fontSize: 28, color: "#512da8" }} />
                  <Card.Title className="mb-0 ms-2" style={{ fontWeight: 700, fontSize: 20 }}>
                    Backup Multiple VM
                  </Card.Title>
                </div>
                <Form onSubmit={handleBackupSchedule}>
                  <Form.Group className="mb-3">
                    <Form.Label>Masukkan VM ID (pisahkan koma/spasi):</Form.Label>
                    <Form.Control
                      type="text"
                      value={backupIdsText}
                      onChange={(e) => setBackupIdsText(e.target.value)}
                      placeholder="Contoh: 100,101,102"
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Pilih Preset Backup:</Form.Label>
                    <Form.Select
                      value={backupPreset}
                      onChange={(e) => setBackupPreset(e.target.value)}
                    >
                      <option value="daily">Every day</option>
                      <option value="monday-friday">Monday to Friday</option>
                      <option value="every-saturday">Every Saturday</option>
                      <option value="first-day-month">First day of the Month</option>
                      <option value="first-day-year">First day of the Year</option>
                      <option value="every-hour">Every hour</option>
                      <option value="every-30-minutes">Every 30 minutes</option>
                      <option value="every-2-hours">Every two hours</option>
                    </Form.Select>
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Masukkan Jam Backup (HH:MM):</Form.Label>
                    <Form.Control
                      type="time"
                      value={backupTime}
                      onChange={(e) => setBackupTime(e.target.value)}
                      disabled={["every-hour", "every-30-minutes", "every-2-hours"].includes(backupPreset)}
                    />
                  </Form.Group>
                  <Button variant="primary" type="submit" className="w-100 fw-bold">
                    Schedule Backup
                  </Button>
                </Form>
              </Card.Body>
            </Card>
          </Col>

          {/* Backup ALL VM */}
          <Col md={6}>
            <Card className="shadow border-0 h-100" style={{ borderRadius: 18 }}>
              <Card.Body>
                <div className="d-flex align-items-center mb-2">
                  <BsCloudCheck style={{ fontSize: 28, color: "#388e3c" }} />
                  <Card.Title className="mb-0 ms-2" style={{ fontWeight: 700, fontSize: 20 }}>
                    Backup ALL VM
                  </Card.Title>
                </div>
                <Form>
                  <Form.Group className="mb-3">
                    <Form.Label>Pilih Preset Backup:</Form.Label>
                    <Form.Select
                      value={backupAllPreset}
                      onChange={(e) => setBackupAllPreset(e.target.value)}
                    >
                      <option value="daily">Every day</option>
                      <option value="monday-friday">Monday to Friday</option>
                      <option value="every-saturday">Every Saturday</option>
                      <option value="first-day-month">First day of the Month</option>
                      <option value="first-day-year">First day of the Year</option>
                      <option value="every-hour">Every hour</option>
                      <option value="every-30-minutes">Every 30 minutes</option>
                      <option value="every-2-hours">Every two hours</option>
                    </Form.Select>
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Masukkan Jam Backup (HH:MM):</Form.Label>
                    <Form.Control
                      type="time"
                      value={backupAllTime}
                      onChange={(e) => setBackupAllTime(e.target.value)}
                      disabled={["every-hour", "every-30-minutes", "every-2-hours"].includes(backupAllPreset)}
                    />
                  </Form.Group>
                  <Button
                    variant="success"
                    className="w-100 fw-bold"
                    type="button"
                    data-cy="backup-all-vm-btn"
                    onClick={handleBackupAllVM}
                    style={{ background: "#388e3c" }}
                  >
                    Schedule Backup All VM
                  </Button>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* STOP BACKUP */}
        <Row className="mt-4">
          <Col md={12}>
            <Card className="shadow-sm border-0" style={{ borderRadius: 18 }}>
              <Card.Body>
                <div className="d-flex align-items-center mb-2">
                  <BsStopCircle style={{ fontSize: 24, color: "#d32f2f" }} />
                  <Card.Title className="mb-0 ms-2" style={{ fontWeight: 600, fontSize: 18 }}>
                    Stop Semua Backup
                  </Card.Title>
                </div>
                <Button
                  variant="danger"
                  className="w-100 fw-bold"
                  onClick={handleStopBackup}
                >
                  Stop Semua Backup
                </Button>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* STATUS */}
        <Row className="mt-4">
          <Col md={12}>
            {backupMessage && (
              <Alert
                variant={backupMessage.includes("Gagal") || backupMessage.includes("Error") ? "danger" : "info"}
                style={{ borderRadius: 12, fontWeight: 500, fontSize: 16, whiteSpace: "pre-line" }}
              >
                {backupMessage
                  .split('\n')
                  .map((line, idx) => <div key={idx}>{line}</div>)
                }
              </Alert>
            )}
          </Col>
        </Row>
      </div>\
    </div>
  );
}

export default BackupVM;
