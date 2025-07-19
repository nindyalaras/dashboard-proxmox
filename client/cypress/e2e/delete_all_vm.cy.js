describe('E2E DELETE ALL VM dengan berbagai skenario', () => {
  const username = 'admin';
  const password = 'tes123';

  // Helper login biar DRY
  function loginDashboard() {
    cy.visit('http://localhost:3000');
    cy.get('input[placeholder="Username"]').type(username);
    cy.get('input[placeholder="Password"]').type(password);
    cy.get('button').contains('Login').click();
    cy.get('.card-title')
      .contains('Delete VM')
      .parents('.card')
      .find('button')
      .contains('Mulai')
      .click();
  }

  // Helper buka List VM
  function goToListVM() {
    cy.contains('Kembali ke Main Menu').click();
    cy.get('.card-title')
      .contains('List VM')
      .parents('.card')
      .find('button')
      .contains('Mulai')
      .click();
    cy.wait(8000);
  }

  // Helper klik konfirmasi modal delete all
  function confirmDeleteAll() {
    cy.get('.modal').should('be.visible');
    cy.get('[data-cy="confirm-delete-all-vm"]').click();
  }

  // SCENARIO A: Normal (ada VM stopped, ada running, ada excluded)
//  it('SCENARIO A - Berhasil hapus saat stopped dan gagal saat running', () => {
//    loginDashboard();
//    cy.contains('Delete ALL VM').click();
//    confirmDeleteAll(); 
//    cy.wait(8000);

    // Berhasil dihapus (stopped)
//    [100, 104, 105].forEach(id => {
//      cy.get('pre').should('contain.text', `DELETE_RESULT: ${id} - VM berhasil dihapus`);
//    });

    // Gagal karena running
//    [110, 111].forEach(id => {
//      cy.get('pre').invoke('text').should('match', new RegExp(`DELETE_RESULT: ${id} - VM masih menyala`));
//    });

    // Cek hasil List VM 
//    goToListVM();
//    cy.wait(20000);
//    [103, 107, 108].forEach(id => {
//      cy.get('td').contains(`${id}`);
//    });
//    [100, 104, 105].forEach(id => {
//      cy.get('td').should('not.contain.text', `${id}`);
//    });
//  });

  // SCENARIO B: Tidak ada VM yang bisa dihapus
  it('SCENARIO B - Semua sudah kosong', () => {
    loginDashboard();
    cy.contains('Delete ALL VM').click();
    confirmDeleteAll(); // WAJIB, biar modalnya jalan
    cy.get('[data-cy="output-delete-vm"]', { timeout: 15000 }) // lebih aman timeout
      .invoke('text')
      .should('include', 'Tidak ada VM yang dihapus.');
  });

  // SCENARIO C: Backend error
//  it('SCENARIO C - Simulasi error dari backend', () => {
//    loginDashboard();

//    cy.intercept('POST', '/api/delete-all', {
//      statusCode: 500,
//      body: { error: 'Gagal terhubung ke Proxmox' }
//    }).as('deleteAllError');

//    cy.contains('Delete ALL VM').click();
//    confirmDeleteAll();
//    cy.wait('@deleteAllError');
//    cy.get('[data-cy="output-delete-vm"]', { timeout: 15000 })
//      .invoke('text')
//      .should('match', /(Gagal hapus VM|Gagal terhubung ke Proxmox)/);
//  });
});

