// src/MainMenu.js
import React, { useState } from "react";
import { Button, Card, Container, Row, Col } from "react-bootstrap";
import dashboardSvg from "./assets/Cloud hosting-amico.svg";
import CloneVM from "./CloneVM";
import DeleteVM from "./DeleteVM";
import ListVM from "./ListVM";
import BackupVM from "./BackupVM";
import RecoveryVM from "./RecoveryVM";
import StartVM from "./StartVM"
import StopVM from "./StopVM";

function MainMenu({ onLogout }) {
  const [activeMenu, setActiveMenu] = useState(null);

  function renderBackButton() {
    return (
      <Button
        variant="outline-secondary"
        style={{ borderRadius: 20, margin: 20, position: "absolute", left: 0, top: 0, zIndex: 10 }}
        onClick={() => setActiveMenu(null)}
      >
        &larr; Kembali ke Main Menu
      </Button>
    );
  }

  if (activeMenu === "clone") return <div>{renderBackButton()}<CloneVM /></div>;
  if (activeMenu === "delete") return <div>{renderBackButton()}<DeleteVM /></div>;
  if (activeMenu === "list") return <div>{renderBackButton()}<ListVM /></div>;
  if (activeMenu === "backup") return <div>{renderBackButton()}<BackupVM /></div>;
  if (activeMenu === "recovery") return <div>{renderBackButton()}<RecoveryVM /></div>;
  if (activeMenu === "start") return <div>{renderBackButton()}<StartVM /></div>;
  if (activeMenu === "stop") return <div>{renderBackButton()}<StopVM /></div>;

  // Main menu tampilan awal (landing page dashboard)
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(120deg, #d1c4e9 0%, #e1bee7 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Container style={{ marginTop: "60px", marginBottom: "40px" }}>
        <Row className="align-items-center justify-content-center" style={{ minHeight: "75vh" }}>
          <Col md={6} className="text-center mb-5">
            <img src={dashboardSvg} alt="Dashboard Illustration" style={{ maxWidth: 360, width: "90%" }} />
            <h1 className="mt-4 mb-3 fw-bold" style={{ color: "#512da8" }}>
              NadNin Proxmox Dashboard
            </h1>
            <p className="text-muted" style={{ fontSize: 18 }}>
              Selamat datang di dashboard otomasi Proxmox!
              <br />
              Silakan pilih menu untuk mulai mengelola VM kamu.
            </p>
            <Button variant="outline-danger" onClick={onLogout} style={{ borderRadius: 20, marginTop: 30 }}>
              Logout
            </Button>
          </Col>
          <Col md={6}>
            <Row xs={1} md={2} className="g-4">
              {/* CLONE VM CARD */}
              <Col>
                <Card className="shadow-sm border-0" style={{ borderRadius: 16 }}>
                  <Card.Body className="text-center">
                    <i className="bi bi-box-arrow-down" style={{ fontSize: 36, color: "#3949ab" }}></i>
                    <Card.Title>Clone VM</Card.Title>
                    <Card.Text>Buat salinan VM dari template secara instan.</Card.Text>
                    <Button
                      variant="primary"
                      style={{ borderRadius: 16, fontWeight: "bold" }}
                      onClick={() => setActiveMenu("clone")}
                    >
                      Mulai
                    </Button>
                  </Card.Body>
                </Card>
              </Col>
              <Col>
                <Card className="shadow-sm border-0" style={{ borderRadius: 16 }}>
                  <Card.Body className="text-center">
                    <i className="bi bi-trash" style={{ fontSize: 36, color: "#c62828" }}></i>
                    <Card.Title>Delete VM</Card.Title>
                    <Card.Text>Hapus satu atau banyak VM sekaligus dengan input ID.</Card.Text>
                    <Button
                      variant="danger"
                      style={{ borderRadius: 16, fontWeight: "bold" }}
                      onClick={() => setActiveMenu("delete")}
                    >
                      Mulai
                    </Button>
                  </Card.Body>
                </Card>
              </Col>
              <Col>
                <Card className="shadow-sm border-0" style={{ borderRadius: 16 }}>
                  <Card.Body className="text-center">
                    <i className="bi bi-list-ul" style={{ fontSize: 36, color: "#388e3c" }}></i>
                    <Card.Title>List VM</Card.Title>
                    <Card.Text>Lihat daftar VM beserta status dan IP address.</Card.Text>
                    <Button
                      variant="success"
                      style={{ borderRadius: 16, fontWeight: "bold" }}
                      onClick={() => setActiveMenu("list")}
                    >
                      Mulai
                    </Button>
                  </Card.Body>
                </Card>
              </Col>
              {/* BACKUP VM CARD */}
              <Col>
                <Card className="shadow-sm border-0" style={{ borderRadius: 16 }}>
                  <Card.Body className="text-center">
                    <i className="bi bi-cloud-arrow-up" style={{ fontSize: 36, color: "#6c47b8" }}></i>
                    <Card.Title>Backup VM</Card.Title>
                    <Card.Text>Jadwalkan backup banyak VM sekaligus atau seluruh VM otomatis.</Card.Text>
                    <Button
                      variant="info"
                      style={{ borderRadius: 16, fontWeight: "bold", color: "#fff", background: "#6c47b8" }}
                      onClick={() => setActiveMenu("backup")}
                    >
                      Mulai
                    </Button>
                  </Card.Body>
                </Card>
              </Col>
              {/* ======= RECOVERY VM CARD ======= */}
              <Col>
                <Card className="shadow-sm border-0" style={{ borderRadius: 16 }}>
                  <Card.Body className="text-center">
                    <i className="bi bi-arrow-clockwise" style={{ fontSize: 36, color: "#0097a7" }}></i>
                    <Card.Title>Recovery VM</Card.Title>
                    <Card.Text>Restore VM dari backup otomatis Proxmox PBS.</Card.Text>
                    <Button
                      variant="secondary"
                      style={{ borderRadius: 16, fontWeight: "bold", background: "#0097a7", color: "#fff" }}
                      onClick={() => setActiveMenu("recovery")}
                    >
                      Mulai
                    </Button>
                  </Card.Body>
                </Card>
              </Col>
              {/* START VM CARD */}
              <Col>
                <Card className="shadow-sm border-0" style={{ borderRadius: 16 }}>
                  <Card.Body className="text-center">
                    <i className="bi bi-play-fill" style={{ fontSize: 36, color: "#4caf50" }}></i>
                    <Card.Title>Start VM</Card.Title>
                    <Card.Text>Mulai banyak VM atau bulk start semua VM mati.</Card.Text>
                    <Button variant="success" style={{ borderRadius: 16, fontWeight: "bold" }} onClick={() => setActiveMenu("start")}>
                      Mulai
                    </Button>
                  </Card.Body>
                </Card>
              </Col>
              {/* STOP VM CARD */}
              <Col>
                <Card className="shadow-sm border-0" style={{ borderRadius: 16 }}>
                  <Card.Body className="text-center">
                    <i className="bi bi-power" style={{ fontSize: 36, color: "#ff5722" }}></i>
                    <Card.Title>Stop VM</Card.Title>
                    <Card.Text>Stop banyak VM sekaligus atau bulk stop semua VM aktif.</Card.Text>
                    <Button variant="warning" style={{ borderRadius: 16, fontWeight: "bold" }} onClick={() => setActiveMenu("stop")}>
                      Mulai
                    </Button>
                  </Card.Body>
                </Card>
              </Col>
              {/* Tambahin menu lain (Delete/List/Backup/Recovery) kalau mau */}
              {/* ... */}
            </Row>
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default MainMenu;
