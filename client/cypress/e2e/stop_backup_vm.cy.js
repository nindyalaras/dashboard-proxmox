describe('E2E STOP BACKUP VM', () => {
  const username = 'admin';
  const password = 'tes123';

  // Helper login dashboard
  function loginDashboard() {
    cy.visit('http://localhost:3000');
    cy.get('input[placeholder="Username"]').type(username);
    cy.get('input[placeholder="Password"]').type(password);
    cy.get('button').contains('Login').click();
    cy.contains('Backup VM', { timeout: 5000 }).should('exist');
    cy.get('button').contains('Backup VM').click();
  }

  it('Berhasil stop semua backup (hapus cron)', () => {
    // Intercept request
    cy.intercept('POST', '**/api/stop-backup').as('stopBackup');
    loginDashboard();

    // Klik tombol stop backup
    cy.get('button').contains('Stop Semua Backup').click();

    // Tunggu request selesai
    cy.wait('@stopBackup').its('response.statusCode').should('eq', 200);

    // Pastikan pesan muncul di UI
    cy.get('pre').should('contain.text', 'Semua backup rutin dihentikan');
  });

  it('Handle error saat stop backup (simulasi server error)', () => {
    cy.intercept('POST', '**/api/stop-backup', {
      statusCode: 500,
      body: { error: 'Simulasi error stop cron' }
    }).as('errStopBackup');
    loginDashboard();

    cy.get('button').contains('Stop Semua Backup').click();

    cy.wait('@errStopBackup');

    // Pesan error muncul di UI
    cy.get('pre').should('contain.text', 'Gagal stop backup: Simulasi error stop cron');
  });
});
