import React, { useState } from "react";
import { Card, Button, Form, Alert, Spinner, Modal } from "react-bootstrap";


function normalizeVmIds(str) {
  return str
    .split(/[\s,]+/)
    .filter((id) => id.trim() !== "")
    .map((id) => id.trim())
    .sort()
    .join(",");
}

function DeleteVM() {
  const [deleteIds, setDeleteIds] = useState("");         // input user
  const [deleteMessage, setDeleteMessage] = useState(""); // hasil delete by ID
  const [deleteAllMessage, setDeleteAllMessage] = useState(""); // hasil delete all
  const [loading, setLoading] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [confirmIds, setConfirmIds] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [showModalAll, setShowModalAll] = useState(false);

  const handleConfirmDelete = async () => {
    const input = normalizeVmIds(deleteIds);
    const confirm = normalizeVmIds(confirmIds);

    if (input !== confirm) {
      setConfirmError("VM ID tidak cocok! Pastikan sama persis seperti input awal.");
      return;
    }

    setConfirmError("");
    setShowModal(false);
    setDeleteMessage("Menghapus VM...");
    setLoading(true);

    const vm_ids = deleteIds
      .split(/[\s,]+/)
      .filter((id) => id.trim() !== "");

    try {
      const res = await fetch("http://localhost:8091/api/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vm_ids }),
      });

      const data = await res.json();
      if (res.ok) {
        if (data.results && Array.isArray(data.results) && data.results.length > 0) {
          setDeleteMessage(data.results.join('\n'));
        } else if (data.output && data.output.match(/DELETE_RESULT:/)) {
          const regex = /^DELETE_RESULT:.*$/gm;
          const result = data.output.match(regex)?.map(line => line.replace(/"$/, "")).join('\n') || '';
          setDeleteMessage(result);
        } else if (data.output) {
          setDeleteMessage(data.output.replace(/"$/gm, ""));
        } else {
          setDeleteMessage('Penghapusan selesai.');
        }
      } else {
        setDeleteMessage(`Gagal menghapus VM: ${data.error || "Unknown error"}`);
      }
    } catch (err) {
      setDeleteMessage(`Error: ${err.message}`);
    }
    setLoading(false);
    setDeleteIds("");
    setConfirmIds("");
  };

  // Buka modal konfirmasi sebelum benar-benar hapus
  const handleShowModal = (e) => {
    e.preventDefault();
    setShowModal(true);
  };
  const handleCloseModal = (e) => {
    e.preventDefault();
    setShowModal(false);
  };

  // Handler delete all
  const handleDeleteAll = async () => {
    setDeleteAllMessage("Menghapus semua VM ...");
    setLoadingAll(true);

    try {
      const res = await fetch("http://localhost:8091/api/delete-all", {
        method: "POST"
      });
      const data = await res.json();
      if (res.ok) {
        if (data.results && Array.isArray(data.results) && data.results.length > 0) {
          setDeleteAllMessage(data.results.join('\n'));
        } else {
          setDeleteAllMessage('Tidak ada VM yang dihapus.');
        }
      } else {
        setDeleteAllMessage(`Gagal hapus semua VM: ${data.error}`);
      }
    } catch (err) {
      setDeleteAllMessage(`Error: ${err.message}`);
    }
    setLoadingAll(false);
  };

  const handleDeleteAllConfirmed = async () => {
    setDeleteAllMessage("Menghapus semua VM ...");
    setLoadingAll(true);
    setShowModalAll(false);

    try {
      const res = await fetch("http://localhost:8091/api/delete-all", {
        method: "POST"
      });
      const data = await res.json();
      if (res.ok) {
        if (data.results && Array.isArray(data.results) && data.results.length > 0) {
          setDeleteAllMessage(data.results.join('\n'));
        } else {
          setDeleteAllMessage('Tidak ada VM yang dihapus.');
        }
      } else {
        setDeleteAllMessage(`Gagal hapus semua VM: ${data.error}`);
      }
    } catch (err) {
      setDeleteAllMessage(`Error: ${err.message}`);
    }
    setLoadingAll(false);
  };

  const handleShowModalAll = (e) => {
    e.preventDefault();
    setShowModalAll(true);
  };
  const handleCloseModalAll = (e) => {
    e.preventDefault();
    setShowModalAll(false);
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
      <Card className="shadow-lg p-4" style={{ borderRadius: "1.5rem", width: "100%", maxWidth: 480 }}>
        <Card.Body>
          <Card.Title className="mb-4 text-center" style={{ fontWeight: 700, fontSize: "2rem", color: "#c62828" }}>
            Delete Proxmox VM
          </Card.Title>
          <Form onSubmit={handleShowModal}>
            <Form.Group className="mb-3">
              <Form.Label>
                Masukkan banyak VM ID <span className="text-muted">(pisahkan dengan koma/spasi)</span>
              </Form.Label>
              <Form.Control
                type="text"
                placeholder="Contoh: 110, 115 117"
                value={deleteIds}
                onChange={(e) => setDeleteIds(e.target.value)}
                required
                autoFocus
                data-cy="input-delete-vm"
              />
            </Form.Group>
            <div className="d-grid gap-2 mb-2">
              <Button
                type="submit"
                variant="danger"
                size="lg"
                disabled={loading || !deleteIds.trim()}
                style={{
                  background: "linear-gradient(90deg, #ff5252 0%, #f48fb1 100%)",
                  border: "none",
                  fontWeight: 600,
                }}
                data-cy="submit-delete-vm"
              >
                {loading ? <Spinner animation="border" size="sm" /> : "Delete VM (by ID)"}
              </Button>
            </div>
          </Form>
          {/* Tombol Delete ALL VM */}
          <div className="d-grid gap-2 mb-2">
            <Button
              variant="outline-danger"
              size="lg"
              disabled={loadingAll}
              onClick={handleShowModalAll}
              style={{
                borderRadius: "10px",
                border: "2px solid #d32f2f",
                fontWeight: 600,
                marginTop: 8,
              }}
              data-cy="delete-all-vm"
            >
              {loadingAll ? <Spinner animation="border" size="sm" /> : "Delete ALL VM"}
            </Button>
          </div>

          {/* NOTIFIKASI HASIL DELETE ALL */}
          {deleteAllMessage && (
            <Alert
              variant={deleteAllMessage.toLowerCase().includes("gagal") ? "danger" : "info"}
              className="mt-4 text-center"
              style={{ whiteSpace: "pre-wrap" }}
              data-cy="output-delete-vm"
            >
              <pre style={{ margin: 0 }}>{deleteAllMessage}</pre>
            </Alert>
          )}
          {/* Modal konfirmasi input ulang */}
          <Modal show={showModal} onHide={() => setShowModal(false)} centered>
            <Modal.Header closeButton>
              <Modal.Title>Konfirmasi Penghapusan VM</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <div>
                <div>
                  Yakin ingin menghapus semua VM berikut?  
                  <br /><span style={{ color: "#b71c1c", fontWeight: 600 }}>{deleteIds}</span>
                </div>
                <div className="mt-3">
                  <b>Ketik ulang semua VM ID untuk konfirmasi:</b>
                  <Form.Control
                    className="mt-2"
                    type="text"
                    placeholder="Masukkan ulang semua VM ID"
                    value={confirmIds}
                    onChange={(e) => setConfirmIds(e.target.value)}
                    autoFocus
                  />
                </div>
                {confirmError && (
                  <Alert variant="danger" className="mt-3">
                    {confirmError}
                  </Alert>
                )}
                <Alert variant="danger" className="mt-3">
                  <b>PERMANEN:</b> Data VM akan dihapus & tidak bisa dikembalikan!
                </Alert>
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowModal(false)}>
                Batal
              </Button>
              <Button variant="danger" onClick={handleConfirmDelete} disabled={loading} data-cy="confirm-delete-vm">
                {loading ? <Spinner animation="border" size="sm" /> : "Konfirmasi & Hapus"}
              </Button>
            </Modal.Footer>
          </Modal>
          <Modal show={showModalAll} onHide={handleCloseModalAll} centered>
            <Modal.Header closeButton>
              <Modal.Title>Konfirmasi Penghapusan Semua VM</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Alert variant="danger">
                <b>PERMANEN:</b> Semua VM akan dihapus & tidak bisa dikembalikan!<br />
                Yakin ingin menghapus <u>SEMUA</u> VM?
              </Alert>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={handleCloseModalAll}>
                Batal
              </Button>
              <Button variant="danger" onClick={handleDeleteAllConfirmed} disabled={loadingAll} data-cy="confirm-delete-all-vm">
                {loadingAll ? <Spinner animation="border" size="sm" /> : "Konfirmasi & Hapus Semua"}
              </Button>
            </Modal.Footer>
          </Modal>

          {/* Notifikasi hasil */}
          {deleteMessage && (
            <Alert
              data-cy="output-delete-vm"
              variant={
                deleteMessage.toLowerCase().includes("gagal") ||
                deleteMessage.toLowerCase().includes("error")
                  ? "danger"
                  : "info"
              }
              className="mt-4 text-center"
              style={{ whiteSpace: "pre-wrap" }}
            >
              <pre style={{ margin: 0 }}>{deleteMessage}</pre>
            </Alert>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}

export default DeleteVM;
