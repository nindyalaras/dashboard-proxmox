import React, { useState } from "react";
import { Card, Row, Col, Button, Form, Alert, Spinner } from "react-bootstrap";
import { BsArrowClockwise, BsCloudDownload, BsListCheck } from "react-icons/bs";

// =========================
// Utility Functions
// =========================

// Group backup by VMID, sort per-VM latest first, VMID ASC
function groupAndSortBackups(backupList) {
  const grouped = {};
  for (const item of backupList) {
    const vmid = item["backup-id"];
    if (!grouped[vmid]) grouped[vmid] = [];
    grouped[vmid].push(item);
  }
  for (const vmid in grouped) {
    grouped[vmid].sort((a, b) => b["backup-time"] - a["backup-time"]);
  }
  const sortedVmid = Object.keys(grouped).sort((a, b) => Number(a) - Number(b));
  return { grouped, sortedVmid };
}

// Format UNIX timestamp to "DD/MM/YYYY HH.MM.SS WIB" (UTC+7)
function formatBackupDateWIB(timestamp) {
  const date = new Date((timestamp + 7 * 3600) * 1000); // +7 jam
  const pad = n => n.toString().padStart(2, '0');
  return `${pad(date.getUTCDate())}/${pad(date.getUTCMonth() + 1)}/${date.getUTCFullYear()} ${pad(date.getUTCHours())}.${pad(date.getUTCMinutes())}.${pad(date.getUTCSeconds())} WIB`;
}

function RecoveryVM() {
  // Manual Recovery
  const [availableBackups, setAvailableBackups] = useState([]);
  const [selectedBackups, setSelectedBackups] = useState([]);
  const [newVmIdsForRestore, setNewVmIdsForRestore] = useState('');
  const [recoverMessage, setRecoverMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Recovery All
  const [recoverAllMessage, setRecoverAllMessage] = useState('');
  const [recoverAllMapping, setRecoverAllMapping] = useState([]);
  const [recoverAllLog, setRecoverAllLog] = useState('');
  const [loadingRecoverAll, setLoadingRecoverAll] = useState(false);

  // Fetch list backup PBS dari backend
  const handleFetchBackups = async () => {
    try {
      const res = await fetch('http://localhost:8091/api/fetch-backup');
      const data = await res.json();
      if (res.ok) {
        setAvailableBackups(data.backups || []);
        setRecoverMessage('Daftar backup berhasil di-refresh');
      } else {
        setRecoverMessage('Gagal ambil backup: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      setRecoverMessage('Error: ' + err.message);
    }
  };

  // Manual Recovery selected backup (by centang)
  const handleRecover = async (e) => {
    e.preventDefault();
    setRecoverMessage('Recovery in progress...');
    setLoading(true);

    const vmids = newVmIdsForRestore.split(/[, ]+/).map(s => s.trim()).filter(Boolean);

    if (selectedBackups.length === 0) {
      setRecoverMessage('Pilih minimal satu file backup!');
      setLoading(false);
      return;
    }
    if (!newVmIdsForRestore.trim()) {
      setRecoverMessage('Isi VM ID baru!');
      setLoading(false);
      return;
    }
    if (vmids.length !== selectedBackups.length) {
      setRecoverMessage('Jumlah VM ID baru HARUS sama dengan jumlah backup yang dicentang!');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('http://localhost:8091/api/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backups: selectedBackups, vmids }),
      });
      const data = await res.json();
      if (res.ok) {
        setRecoverMessage('Recovery berhasil:\n' + data.output);
      } else {
        setRecoverMessage('Recovery gagal:\n' + data.error);
      }
    } catch (err) {
      setRecoverMessage('Error: ' + err.message);
    }
    setLoading(false);
  };

  // Recovery ALL Backup: auto assign VMID baru
  const handleRecoverAll = async () => {
    setRecoverAllMessage('Proses recovery all backup...');
    setRecoverAllMapping([]);
    setRecoverAllLog('');
    setLoadingRecoverAll(true);
    try {
      const res = await fetch('http://localhost:8091/api/recover-all-backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (res.ok) {
        setRecoverAllMessage('Recovery all backup berhasil!');
        setRecoverAllMapping(data.mapping || []);
        setRecoverAllLog(data.output || '');
      } else {
        setRecoverAllMessage(`Recovery all gagal: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      setRecoverAllMessage(`Error: ${err.message}`);
    }
    setLoadingRecoverAll(false);
  };

  // RENDER LIST BACKUP (pakai Card dan Form.Check)
  const renderBackupList = () => {
    const { grouped, sortedVmid } = groupAndSortBackups(availableBackups);

    return (
      <div style={{ maxHeight: 260, overflowY: "auto", background: "#f7f7ff", borderRadius: 8, padding: 10 }}>
        {sortedVmid.length === 0 && <div>Belum ada data backup</div>}
        {sortedVmid.map((vmid) => (
          <div key={vmid} className="mb-3">
            <div className="fw-bold" style={{ color: "#6c47b8", fontSize: 16 }}>
              VMID: {vmid}
            </div>
            {grouped[vmid].map((backup, idx) => {
              const backupTimeWIB = formatBackupDateWIB(backup["backup-time"]);
              const storagePBS = "pbs-nadnin";
              const backupTimeUTC = new Date(backup["backup-time"] * 1000).toISOString().replace('.000Z', 'Z');
              const volid = `${storagePBS}:backup/vm/${vmid}/${backupTimeUTC}`;
              return (
                <Form.Check
                  key={idx}
                  type="checkbox"
                  id={`backup-${vmid}-${idx}`}
                  label={
                    <span style={{ fontFamily: "monospace", fontSize: 14 }}>
                      {backupTimeWIB} <span className="text-muted">|</span> <span style={{ color: "#999" }}>File: {volid}</span>
                    </span>
                  }
                  checked={selectedBackups.includes(volid)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedBackups((prev) => [...prev, volid]);
                    } else {
                      setSelectedBackups((prev) =>
                        prev.filter((b) => b !== volid)
                      );
                    }
                  }}
                  style={{ marginLeft: 16, marginTop: 6, marginBottom: 2 }}
                />
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  // === UI ===
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
          {/* ========== MANUAL RECOVERY ========== */}
          <Col md={6}>
            <Card className="shadow border-0 h-100" style={{ borderRadius: 18 }}>
              <Card.Body>
                <div className="d-flex align-items-center mb-2">
                  <BsCloudDownload style={{ fontSize: 28, color: "#512da8" }} />
                  <Card.Title className="mb-0 ms-2" style={{ fontWeight: 700, fontSize: 20 }}>
                    Manual Recovery VM
                  </Card.Title>
                </div>
                <Button variant="outline-primary" size="sm" className="mb-2 fw-bold" onClick={handleFetchBackups}>
                  <BsListCheck className="me-1" />
                  Refresh List Backup
                </Button>
                {renderBackupList()}
                <Form onSubmit={handleRecover} className="mt-2">
                  <Form.Group className="mb-2">
                    <Form.Label className="fw-semibold">
                      VM ID Baru untuk tiap backup <span style={{ fontWeight: 400, color: "#888" }}>(pisahkan koma/spasi)</span>
                    </Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Contoh: 120,121"
                      value={newVmIdsForRestore}
                      onChange={e => setNewVmIdsForRestore(e.target.value)}
                      data-cy="input-recover-vmid"
                    />
                  </Form.Group>
                  <Button
                    type="submit"
                    variant="success"
                    className="w-100 fw-bold"
                    disabled={loading}
                  >
                    {loading ? <Spinner animation="border" size="sm" /> : <BsCloudDownload className="me-1" />}
                    Recover Selected
                  </Button>
                </Form>
                {/* STATUS */}
                <div className="mt-3">
                  {recoverMessage && (
                    <Alert
                      variant={recoverMessage.toLowerCase().includes("gagal") || recoverMessage.toLowerCase().includes("error") ? "danger" : "info"}
                      style={{ borderRadius: 12, fontWeight: 500, fontSize: 16, whiteSpace: "pre-line" }}
                    >
                      {recoverMessage}
                    </Alert>
                  )}
                </div>
              </Card.Body>
            </Card>
          </Col>

          {/* ========== RECOVERY ALL ========== */}
          <Col md={6}>
            <Card className="shadow border-0 h-100" style={{ borderRadius: 18 }}>
              <Card.Body>
                <div className="d-flex align-items-center mb-2">
                  <BsArrowClockwise style={{ fontSize: 28, color: "#388e3c" }} />
                  <Card.Title className="mb-0 ms-2" style={{ fontWeight: 700, fontSize: 20 }}>
                    Recovery ALL Backup
                  </Card.Title>
                </div>
                <Button
                  variant="primary"
                  className="w-100 fw-bold mb-3"
                  onClick={handleRecoverAll}
                  disabled={loadingRecoverAll}
                >
                  {loading ? <Spinner animation="border" size="sm" /> : null}
                  Recover ALL Backup (Auto Assign VMID)
                </Button>
                {/* Mapping + Log */}
                {recoverAllMessage && (
                  <Alert
                    variant={recoverAllMessage.toLowerCase().includes("gagal") || recoverAllMessage.toLowerCase().includes("error") ? "danger" : "info"}
                    style={{ borderRadius: 10, fontSize: 15, whiteSpace: "pre-line" }}
                  >
                    <div>
                      <strong>{recoverAllMessage}</strong>
                      {recoverAllMapping.length > 0 && (
                        <div style={{ marginTop: "1rem" }}>
                          <span>Mapping Backup ke VM Baru:</span>
                          <ul>
                            {recoverAllMapping.map((map, idx) => (
                              <li key={idx}>
                                <span className="badge bg-primary">Backup VMID {map.old_vmid}</span>
                                {" → "}
                                <span className="badge bg-success">VMID baru {map.new_vmid}</span>
                                <br />
                                <small style={{ color: "#369", wordBreak: "break-all" }}>file: {map.backup_volid}</small>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {recoverAllLog && (
                        <details style={{ marginTop: "1rem" }}>
                          <summary>Log Recovery (Ansible Output)</summary>
                          <pre style={{ fontSize: 13 }}>{recoverAllLog}</pre>
                        </details>
                      )}
                    </div>
                  </Alert>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
}

export default RecoveryVM;
