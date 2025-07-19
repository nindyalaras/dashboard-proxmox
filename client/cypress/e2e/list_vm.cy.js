describe('E2E TESTING: List VM Proxmox', () => {
  const username = 'admin';
  const password = 'tes123';

  beforeEach(() => {
    // Login dashboard
    cy.visit('http://localhost:3000');
    cy.get('input[placeholder="Username"]').type(username);
    cy.get('input[placeholder="Password"]').type(password);
    cy.get('button').contains('Login').click();

    // Klik tombol "Mulai" di card List VM (dari main menu)
    cy.get('.card-title')
      .contains('List VM')
      .parents('.card')
      .find('button')
      .contains('Mulai')
      .click();

    // Tunggu proses load VM
    cy.wait(10000); // bisa di-tweak sesuai kecepatan backend lo
  });

  it('Menampilkan daftar semua VM lengkap (ID, status, IP) dan jumlahnya valid', () => {
    // Fetch API langsung untuk validasi jumlah
    cy.request('GET', 'http://localhost:8091/api/list-array').then((response) => {
      expect(response.status).to.eq(200);
      const vms = response.body.vms;
      expect(vms.length).to.be.greaterThan(0);

      // Bandingkan jumlah baris di tabel dengan array dari backend
      cy.get('tbody tr').should('have.length', vms.length);

      // Cek tiap data di baris tabel sama dengan backend
      cy.get('tbody tr').each(($row, idx) => {
        const vm = vms[idx];
        // VM ID
        cy.wrap($row).find('td').eq(0).invoke('text').should('eq', String(vm.vmid));
        // Status
        cy.wrap($row).find('td').eq(1).invoke('text').should('include', vm.status);
        // IP Address
        cy.wrap($row).find('td').eq(2).invoke('text').then((ipText) => {
          // Kosongkan/italic kalau status stopped atau tidak ada IP
          if (['VM is off', 'No IP', 'No IP or guest agent not active'].includes(vm.ip)) {
            expect(ipText.trim()).to.match(/VM is off|No IP|not active/);
          } else {
            expect(ipText.trim()).to.match(/\d+\.\d+\.\d+\.\d+/); // Format IPv4
          }
        });
      });
    });
  });
  
  it('Menampilkan pesan error jika backend error', () => {
    // Simulasi backend error 
    cy.intercept('GET', '/api/list', { statusCode: 500, body: { error: 'Backend error' } }).as('listApiError');

    // Klik tombol Refresh List
    cy.get('button').contains('Refresh List').click();
    cy.wait('@listApiError');

    // Cek error alert muncul
    cy.get('.alert').should('contain.text', 'Backend error');
  });

});
