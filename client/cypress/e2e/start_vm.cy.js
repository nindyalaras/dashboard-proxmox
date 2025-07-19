describe('E2E TESTING: Start Multiple VM & Bulk Start All VM', () => {
  const username = 'admin';
  const password = 'tes123';

  // Helper login
  function loginDashboard() {
    cy.visit('http://localhost:3000');
    cy.get('input[placeholder="Username"]').type(username);
    cy.get('input[placeholder="Password"]').type(password);
    cy.get('button').contains('Login').click();
    cy.get('.card-title')
      .contains('Start VM')
      .parents('.card')
      .find('button')
      .contains('Mulai')
      .click();
  }

  beforeEach(() => {
    loginDashboard();
  });

  it('Start Multiple VM: Sukses', () => {
    cy.get('input[placeholder="Contoh: 101, 102, 103"]').clear().type('105,104');
    cy.contains('Start VMs').click();

    cy.wait(1000);
    cy.get('.alert').invoke('text').then((text) => {
      expect(text).to.include('VM 105: Berhasil');
      expect(text).to.include('VM 104: Berhasil');
    });
  });

  it('Start Multiple VM: VM Sudah Running', () => {
    cy.get('input[placeholder="Contoh: 101, 102, 103"]').clear().type('103');
    cy.contains('Start VMs').click();

    cy.wait(8000);
    cy.get('.alert').invoke('text').then((text) => {
      expect(text).to.include('VM 103: Gagal');
      expect(text).to.include('VM sudah dalam keadaan running');
    });
  });

  it('Start Multiple VM: Input VM ID Tidak Valid', () => {
    cy.get('input[placeholder="Contoh: 101, 102, 103"]').clear().type('9999');
    cy.contains('Start VMs').click();

    cy.wait(8000);
    cy.get('.alert').invoke('text').then((text) => {
      expect(text).to.include('VM 9999: Gagal');
      expect(text).to.include('tidak ditemukan');
    });
  });

  it('Start Multiple VM: Array Kosong', () => {
    cy.get('input[placeholder="Contoh: 101, 102, 103"]').clear();
    cy.contains('Start VMs').click();

    cy.wait(500);
    cy.get('.alert').should('contain', 'Tidak ada VM yang diminta untuk start');
  });

  it('Bulk Start All VM: 100% VM valid diproses (running/skipped)', () => {
    // Ambil list VM dari /api/list
    cy.request('GET', 'http://localhost:8091/api/list').then((res) => {
      const data = res.body.output || '';

      // Ambil semua baris VM_INFO
      const allMatches = Array.from(data.matchAll(/VM_INFO: (\d+) - (running|stopped)/g));
      const totalVM = allMatches.length; // Jumlah semua VM

      // Lakukan aksi Bulk Start
      cy.get('.card-title')
        .contains('Bulk Start Semua VM')
        .parents('.card')
        .find('button')
        .contains('Bulk Start Semua')
        .click();

      cy.wait(4000);

      // Validasi jumlah baris hasil output sama dengan jumlah VM yang ada
      cy.get('.alert').invoke('text').then((text) => {
        const resultLines = text.split('\n').filter(Boolean);
        expect(resultLines.length).to.eq(totalVM);

        // Cek format tiap baris
        resultLines.forEach(line => {
          expect(line).to.match(/^VM \d+ (STARTED|SKIPPED): .+/);
        });
      });
    });
  });

  it('Bulk Start All VM: Semua Sudah Running', () => {
    cy.get('.card-title')
      .contains('Bulk Start Semua VM')
      .parents('.card')
      .find('button')
      .contains('Bulk Start Semua')
      .click();

    cy.wait(4000);
    cy.get('.alert').should('contain', 'Semua VM sudah menyala');
  });
});
