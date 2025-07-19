describe('E2E TESTING: Recovery All VM (PBS Auto Assign New VM ID)', () => {
  const username = 'admin';
  const password = 'tes123';

  // Helper login + klik menu Recover VM dari main menu
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

  it('Berhasil recovery all VM dari PBS dan menampilkan mapping serta log', () => {
    // Login & ke menu Recovery VM
    cy.visit('http://localhost:3000');
    cy.get('input[placeholder="Username"]').type('admin');
    cy.get('input[placeholder="Password"]').type('tes123');
    cy.get('button').contains('Login').click();
    cy.get('.card-title').contains('Recovery VM').parents('.card').find('button').contains('Mulai').click();

    // Refresh List Backup, hitung jumlah VM dengan backup
    cy.contains('Refresh List Backup').click();

    cy.get('.fw-bold')
      .filter((i, el) => el.innerText.startsWith('VMID:'))
      .then($items => {
        const totalBackupVM = $items.length;

        // Klik Recover ALL Backup
        cy.get('button').contains('Recover ALL Backup').click();

        // Tunggu hasil mapping recovery
        cy.contains('Mapping Backup ke VM Baru:', { timeout: 120000 }).should('exist');
        cy.get('ul li').should('have.length', totalBackupVM);  // Ini validasi utama

        cy.get('ul li').each(($li) => {
          expect($li.text()).to.match(/Backup VMID \d+ → VMID baru \d+/);
        });
        cy.contains('Log Recovery (Ansible Output)').click();
        cy.get('details pre').should('exist');
        cy.get('details pre').invoke('text').should('not.contain', 'FAILED');
      });
  });

  it('Berhasil recovery all backup VM dari PBS dan menampilkan mapping serta log', () => {
    loginDashboard();
    // Refresh backup list
    cy.contains('Refresh List').click();
    cy.contains('VMID:', { timeout: 15000 }).should('exist');

    cy.get('button').contains('Recover ALL Backup').click();

    // Tunggu hasil recovery tampil
    cy.contains('Recovery all backup berhasil!', { timeout: 120000 }).should('exist');
    cy.contains('Mapping Backup ke VM Baru:').should('exist');

    cy.get('ul').find('li').should('have.length.greaterThan', 0);

    cy.get('ul li').each(($li) => {
      const text = $li.text();
     if (text.includes("Backup VMID")) {
        expect(text).to.match(/Backup VMID \d+ → VMID baru \d+/);
      }
    });

    cy.contains('Log Recovery (Ansible Output)').click();
    cy.get('details pre').should('exist');
    cy.get('details pre').invoke('text').should('not.contain', 'FAILED');
  });

  it('Menampilkan error jika tidak ada backup sama sekali', () => {
    loginDashboard();
    cy.contains('Refresh List').click();
    cy.contains('VMID:', { timeout: 15000 }).should('exist');

    cy.intercept('POST', '/api/recover-all-backup', {
      statusCode: 400,
      body: { error: 'Tidak ada backup yang tersedia' }
    }).as('failRecoverAll');

    cy.get('button').contains('Recover ALL Backup').click();
    cy.wait('@failRecoverAll');
    cy.contains('Recovery all gagal').should('exist');
    cy.contains('Tidak ada backup yang tersedia').should('exist');
  });

  it('Menampilkan pesan error jika Proxmox unreachable', () => {
    loginDashboard();
    cy.contains('Refresh List').click();
    cy.contains('VMID:', { timeout: 15000 }).should('exist');
    cy.intercept('POST', '/api/recover-all-backup', {
      statusCode: 500,
      body: { error: 'Gagal fetch list VM Proxmox' }
    }).as('failRecoverAll');
    cy.get('button').contains('Recover ALL Backup').click();
    cy.wait('@failRecoverAll');
    cy.contains('Recovery all gagal', { timeout: 10000 }).should('exist');
    cy.contains('Gagal fetch list VM Proxmox').should('exist');
  });

  it('Tombol recover all disable selama proses', () => {
    loginDashboard();
    cy.contains('Refresh List').click();
    cy.contains('VMID:', { timeout: 15000 }).should('exist');
    cy.get('button').contains('Recover ALL Backup').as('recoverAllBtn').click();

    cy.contains('Proses recovery all backup...').should('exist');
    cy.get('@recoverAllBtn').should('be.disabled');
  });
});
