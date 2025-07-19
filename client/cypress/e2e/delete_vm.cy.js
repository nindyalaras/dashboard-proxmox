describe('E2E Testing: Delete Multiple VM', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000');
    cy.get('input[placeholder="Username"]').type('admin');
    cy.get('input[placeholder="Password"]').type('tes123');
    cy.get('button').contains('Login').click();
    cy.get('.card-title')
      .contains('Delete VM')
      .parents('.card')
      .find('button')
      .contains('Mulai')
      .click();
  });

  // Helper untuk handle konfirmasi modal input ulang VM ID
  function confirmDelete(ids) {
    cy.get('.modal').should('be.visible');
    cy.get('.modal input[type="text"]').clear().type(ids);
    cy.get('[data-cy="confirm-delete-vm"]').click();
  }

  it('Delete banyak VM: stopped, running, not found', () => {
    cy.get('[data-cy="input-delete-vm"]').clear().type('116,117,118,112,113');
    cy.get('[data-cy="submit-delete-vm"]').click();

    confirmDelete('116,117,118,112,113'); // input ulang VM ID di modal

    // Tunggu output hasil muncul max 20 detik
    cy.get('[data-cy="output-delete-vm"]', { timeout: 20000 }).should('be.visible');

    // VM stopped, berhasil dihapus
    ['116', '117', '118'].forEach(id => {
      cy.get('[data-cy="output-delete-vm"]').should('contain.text', `DELETE_RESULT: ${id} - VM berhasil dihapus`);
    });

    // VM running, gagal dihapus
    cy.get('[data-cy="output-delete-vm"]').should('contain.text', `DELETE_RESULT: 112 - VM masih menyala`);

    // VM tidak ditemukan
    cy.get('[data-cy="output-delete-vm"]').should('contain.text', `DELETE_RESULT: 113 - VM tidak ditemukan`);
  });

  it('Delete single VM (stopped, sukses)', () => {
    cy.get('[data-cy="input-delete-vm"]').clear().type('119');
    cy.get('[data-cy="submit-delete-vm"]').click();
    confirmDelete('119');
    cy.get('[data-cy="output-delete-vm"]', { timeout: 20000 }).should('contain.text', 'DELETE_RESULT: 119 - VM berhasil dihapus');
  });

  it('Delete single VM (running, gagal)', () => {
    cy.get('[data-cy="input-delete-vm"]').clear().type('115');
    cy.get('[data-cy="submit-delete-vm"]').click();
    confirmDelete('115');
    cy.get('[data-cy="output-delete-vm"]', { timeout: 20000 }).should('contain.text', 'DELETE_RESULT: 115 - VM masih menyala');
  });

  it('Delete single VM (not found)', () => {
    cy.get('[data-cy="input-delete-vm"]').clear().type('134');
    cy.get('[data-cy="submit-delete-vm"]').click();
    confirmDelete('134');
    cy.get('[data-cy="output-delete-vm"]', { timeout: 20000 }).should('contain.text', 'DELETE_RESULT: 134 - VM tidak ditemukan');
  });

});
