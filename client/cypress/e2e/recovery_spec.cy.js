describe('E2E TESTING: Recovery Multiple VM from PBS', () => {
  const username = 'admin';
  const password = 'tes123';

  // Helper login
  function loginDashboard() {
    cy.visit('http://localhost:3000');
    cy.get('input[placeholder="Username"]').type(username);
    cy.get('input[placeholder="Password"]').type(password);
    cy.get('button').contains('Login').click();
    cy.get('.card-title')
      .contains('Recovery VM')
      .parents('.card')
      .find('button')
      .contains('Mulai')
      .click();
  }

  it('Berhasil recovery multiple VM terpilih', () => {
    // Login
    loginDashboard();

    // Klik Refresh List & tunggu isi muncul
    cy.contains('Refresh List').click();

    cy.contains('VMID:', { timeout: 10000 }).should('exist');
    cy.get('input[data-cy="input-recover-vmid"]', { timeout: 10000 }).should('exist');

    // Centang dua file backup pertama dari VM apapun
    cy.get('input[type="checkbox"]').eq(0).check();
    cy.get('input[type="checkbox"]').eq(1).check();

    // Isi VM ID baru
    cy.get('input[data-cy="input-recover-vmid"]').type('109,110');

    // Klik tombol Recover Selected
    cy.get('button[type="submit"]').contains('Recover Selected').click();

    // Tunggu hasil recovery 
    cy.get('.alert', { timeout: 20000 }).should('contain.text', 'Recovery berhasil').and('contain.text', '109').and('contain.text', '110');
  });

  it('Menampilkan error jika tidak centang backup file', () => {
    loginDashboard();
    cy.contains('Refresh List').click();
    cy.contains('VMID:', { timeout: 10000 }).should('exist');
    cy.get('input[data-cy="input-recover-vmid"]').type('111,112');
    cy.get('button[type="submit"]').contains('Recover Selected').click();
    cy.get('.alert').should('contain.text', 'Pilih minimal satu file backup');
  });

  it('Menampilkan error jika VM ID baru kosong', () => {
    loginDashboard();
    cy.contains('Refresh List').click();
    cy.contains('VMID:', { timeout: 10000 }).should('exist');
    cy.get('input[type="checkbox"]').eq(0).check();
    cy.get('input[data-cy="input-recover-vmid"]').clear();
    cy.get('button[type="submit"]').contains('Recover Selected').click();
    cy.get('.alert').should('contain.text', 'Isi VM ID baru');
  });

  it('Menampilkan pesan error jika gagal fetch backup', () => {
    loginDashboard();
    // Intercept API untuk simulasi error
    cy.intercept('GET', '/api/fetch-backup', {
      statusCode: 500,
      body: { error: 'Gagal ambil backup' }
    }).as('failFetch');
    cy.contains('Refresh List').click();
    cy.wait('@failFetch');
    cy.get('.alert').should('contain.text', 'Gagal ambil backup');
  });
});
