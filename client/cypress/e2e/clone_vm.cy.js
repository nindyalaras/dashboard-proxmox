describe('E2E Testing: Clone VM', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000');
    cy.get('input[placeholder="Username"]').type('admin');
    cy.get('input[placeholder="Password"]').type('tes123');
    cy.get('button').contains('Login').click();

    // Klik tombol "Mulai" di card Clone VM
    cy.get('.card-title')
      .contains('Clone VM')
      .parents('.card')
      .find('button')
      .contains('Mulai')
      .click();

    // Tunggu list template muncul dulu 
    cy.get('table tbody tr', { timeout: 10000 }).should('have.length.greaterThan', 0);
  });

  it('Clone dengan input valid', () => {
    cy.get('input[placeholder="ex: 101"]').clear().type('101');
    cy.get('input[placeholder="ex: 2"]').clear().type('2');
    cy.get('button[type="submit"]').click();

    cy.contains('berhasil', { timeout: 15000 }).should('exist');
    cy.contains('vm-').should('exist');
  });

  it('Clone dengan jumlah VM = 0', () => {
    cy.get('input[placeholder="ex: 101"]').clear().type('101');
    cy.get('input[placeholder="ex: 2"]').as('jumlahInput').clear().type('0');
    cy.get('button[type="submit"]').click();

    cy.get('@jumlahInput').then(($input) => {
      expect($input[0].checkValidity()).to.be.false;
    });
  });

  it('Clone dengan Template/VM ID tidak ada', () => {
    cy.get('input[placeholder="ex: 101"]').clear().type('999');
    cy.get('input[placeholder="ex: 2"]').clear().type('2');
    cy.get('button[type="submit"]').click();
    cy.contains('gagal', { timeout: 7000 }).should('exist');
  });

  it('Clone saat VM sedang running', () => {
    cy.get('input[placeholder="ex: 101"]').clear().type('103');
    cy.get('input[placeholder="ex: 2"]').clear().type('2');
    cy.get('button[type="submit"]').click();
    cy.contains('gagal', { timeout: 7000 }).should('exist');
  });
});
