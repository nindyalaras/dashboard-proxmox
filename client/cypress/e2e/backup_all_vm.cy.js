describe('E2E BACKUP ALL VM - SCHEDULE', () => {
  const username = 'admin';
  const password = 'tes123';

  // Helper login dashboard
  function loginDashboard() {
    cy.visit('http://localhost:3000');
    cy.get('input[placeholder="Username"]').type(username);
    cy.get('input[placeholder="Password"]').type(password);
    cy.get('button').contains('Login').click();
    cy.get('.card-title')
      .contains('Backup VM')
      .parents('.card')
      .find('button')
      .contains('Mulai')
      .click();
  }

  beforeEach(() => {
    cy.intercept('POST', '**/api/backup-all-vm').as('backupAll');
    loginDashboard();
  });

  it('Sukses schedule backup ALL preset daily jam custom', () => {
    cy.get('select').eq(1).select('daily');
    cy.get('input[type="time"]').eq(1).clear().type('22:01');
    cy.get('[data-cy="backup-all-vm-btn"]').click();

    cy.wait('@backupAll').its('response.statusCode').should('eq', 200);
    cy.get('.alert').should('contain.text', 'Backup ALL VM dijadwalkan (daily 22:01)');
  });

  it('Gagal backup ALL jika preset butuh jam tapi jam kosong', () => {
    cy.get('select').eq(1).select('daily');
    cy.get('input[type="time"]').eq(1).clear();
    cy.get('[data-cy="backup-all-vm-btn"]').click();

    cy.get('.alert').should('contain.text', 'backup_time required untuk preset ini');
  });

  it('Sukses schedule backup ALL preset every-hour (tanpa jam)', () => {
    cy.get('select').eq(1).select('every-hour');
    cy.get('input[type="time"]').eq(1).should('be.disabled');
    cy.get('[data-cy="backup-all-vm-btn"]').click();

    cy.wait('@backupAll');
    cy.get('.alert').should('contain.text', 'Backup ALL VM dijadwalkan (every-hour)');
  });

  it('Gagal backup ALL jika preset tidak diisi', () => {
    // Kosongkan select, (cari value kosong atau disable manual jika perlu)
    // Simulasikan error pakai intercept (karena select di UI pasti selalu ada default)
    cy.intercept('POST', '**/api/backup-all-vm', {
      statusCode: 400,
      body: { error: 'preset required' }
    }).as('errNoPreset');

    cy.get('select').eq(1).invoke('val', '').trigger('change');
    cy.get('[data-cy="backup-all-vm-btn"]').click();

    cy.get('.alert').should('contain.text', 'preset required');
  });

  it('Simulasi server error (misal crontab error)', () => {
    cy.intercept('POST', '**/api/backup-all-vm', {
      statusCode: 500,
      body: { error: 'Simulasi error backend' }
    }).as('errBackupAll');

    cy.get('select').eq(1).select('daily');
    cy.get('input[type="time"]').eq(1).clear().type('22:01');
    cy.get('[data-cy="backup-all-vm-btn"]').click();

    cy.wait('@errBackupAll');
    cy.get('.alert').should('contain.text', 'Gagal set backup all VM: Simulasi error backend');
  });

});
