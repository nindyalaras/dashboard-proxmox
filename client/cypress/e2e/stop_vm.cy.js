describe('E2E TESTING: Stop Multiple VM & Bulk Stop All VM', () => {
  const username = 'admin';
  const password = 'tes123';

  beforeEach(() => {
    cy.visit('http://localhost:3000');
    cy.get('input[placeholder="Username"]').type(username);
    cy.get('input[placeholder="Password"]').type(password);
    cy.get('form').within(() => {
      cy.contains('Login').click();
    });
    cy.get('.card-title')
      .contains('Stop VM')
      .parents('.card')
      .find('button')
      .contains('Mulai')
      .click();
  });

  it('Stop Multiple VM: Sukses', () => {
    cy.get('input[placeholder="Contoh: 101, 102, 103"]').clear().type('100,108');
    cy.contains('Stop VMs').click();
    cy.wait(3000);
    cy.get('.alert').invoke('text').then(text => {
      // User friendly string assertion
      expect(text).to.include('VM 100 Berhasil: Stop berhasil');
      expect(text).to.include('VM 108 Berhasil: Stop berhasil');
    });
  });

  it('Stop Multiple VM: VM sudah stopped', () => {
    cy.get('input[placeholder="Contoh: 101, 102, 103"]').clear().type('100,108');
    cy.contains('Stop VMs').click();
    cy.wait(6000);
    cy.get('.alert').invoke('text').then(text => {
      expect(text).to.include('VM 100 Gagal: VM sudah dalam keadaan stopped');
      expect(text).to.include('VM 108 Gagal: VM sudah dalam keadaan stopped');
    });
  });

  it('Stop Multiple VM: Input VM ID Tidak Valid', () => {
    cy.get('input[placeholder="Contoh: 101, 102, 103"]').clear().type('9999,150');
    cy.contains('Stop VMs').click();
    cy.wait(2000);
    cy.get('.alert').invoke('text').then(text => {
      expect(text).to.include('VM 9999 Gagal: VM ID tidak ditemukan');
      expect(text).to.include('VM 150 Gagal: VM ID tidak ditemukan');
    });
  });

  it('Stop Multiple VM: Array Kosong', () => {
    cy.get('input[placeholder="Contoh: 101, 102, 103"]').clear();
    cy.contains('Stop VMs').click();
    cy.wait(2000);
    cy.get('.alert').should('contain', 'Tidak ada VM yang diminta untuk stop');
  });

  it('Bulk Stop All VM: Sukses', () => {
    // Jalankan bulk stop dari UI
    cy.get('.card-title')
      .contains('Bulk Stop Semua VM')
      .parents('.card')
      .find('button')
      .contains('Bulk Stop Semua')
      .click();
    cy.wait(5000);
    cy.get('.alert').should('contain', '✔️: Stop berhasil');

    // Cek jumlah VM stopped via backend setelah proses
    cy.request('GET', 'http://localhost:8091/api/list').then((resp) => {
      const data = resp.body.output;
      // Hitung jumlah baris 
      const stopped = (data.match(/VM_INFO: \d+ - stopped/g) || []).length;
      // Hitung total VM (running + stopped)
      const total = (data.match(/VM_INFO: \d+ - (running|stopped)/g) || []).length;
      // Expect: minimal ada VM yang berhasil distop 
      expect(stopped).to.be.gte(1);
    });
  });

  it('Bulk Stop All VM: Semua Sudah Stopped', () => {
    cy.get('.card-title')
      .contains('Bulk Stop Semua VM')
      .parents('.card')
      .find('button')
      .contains('Bulk Stop Semua')
      .click();
    cy.wait(2000);
    cy.get('.alert').should('contain', '❌: VM sudah dalam keadaan stopped');

    const excluded = ['103'];
  
    cy.request('GET', 'http://localhost:8091/api/list').then((resp) => {
      const data = resp.body.output;

      const allMatches = Array.from(data.matchAll(/VM_INFO: (\d+) - (running|stopped)/g));
      // Filter yang bukan template
      const validVMs = allMatches.filter(m => !excluded.includes(m[1]));
      const stoppedVMs = validVMs.filter(m => m[2] === 'stopped');
  
      // Validasi: semua VM non-template sudah stopped
      expect(stoppedVMs.length).to.equal(validVMs.length);
    });
  });
});
