describe('E2E BACKUP MULTIPLE VM SCHEDULED', () => {
  const username = 'admin';
  const password = 'tes123';
  const vmsToBackup = [100,104, 105]; 
  const backupPreset = 'daily';
  const backupTime = '22:36'; 

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

  it('Schedule backup beberapa VM, preset daily, jam custom', () => {
    loginDashboard();

    cy.intercept('GET', '**/api/list').as('getList');

    cy.wait('@getList');

    // Input VM IDs, preset, jam
    cy.get('input[type="text"]').first().clear().type(vmsToBackup.join(','));
    cy.get('select').first().select(backupPreset);
    cy.get('input[type="time"]').first().clear().type(backupTime);

    // Klik Schedule Backup
    cy.get('button').contains('Schedule Backup').click();

    // Status backup muncul
    cy.get('.alert').should('contain.text', `Backup VM [${vmsToBackup.join(',')}] dijadwalkan`);

    // Optional: cek crontab ke file backup-schedules/scheduled_cron.txt, atau manual/ssh
  });

  it('Gagal jika input VM ID kosong', () => {
    loginDashboard();

    cy.get('input[type="text"]').first().clear();
    cy.get('select').first().select(backupPreset);
    cy.get('input[type="time"]').first().clear().type(backupTime);
    cy.get('button').contains('Schedule Backup').click();

    cy.get('.alert').should('contain.text', 'vm_ids dan preset required');
  });

  it('Gagal jika preset butuh jam tapi jam kosong', () => {
    loginDashboard();

    cy.get('input[type="text"]').first().clear().type(vmsToBackup.join(','));
    cy.get('select').first().select('daily');
    cy.get('input[type="time"]').first().clear();
    cy.get('button').contains('Schedule Backup').click();

    cy.get('.alert').should('contain.text', 'backup_time required untuk preset ini');
  });

  it('Gagal jika VM ID tidak valid (angka ngawur)', () => {
    cy.intercept('GET', '**/api/list').as('getList');

    loginDashboard();

    cy.wait('@getList');

    cy.get('input[type="text"]').first().clear().type('abc,999');
    cy.get('select').first().select(backupPreset);
    cy.get('input[type="time"]').first().clear().type(backupTime);
    cy.get('button').contains('Schedule Backup').click();

    cy.get('.alert').invoke('text').should($text => {
      expect(
        $text.includes('Input berikut bukan VM ID yang valid') ||
        $text.includes('VM ID berikut tidak ditemukan')
      ).to.be.true;
    });
  });

  it('Backend error: simulasi 500 dari server', () => {
    cy.intercept('GET', '**/api/list').as('getList');
    cy.intercept('POST', '/api/schedule-backup', {
      statusCode: 500,
      body: { error: 'Simulasi error backup' }
    }).as('errBackup');

    loginDashboard();

    cy.wait('@getList');

    cy.get('input[type="text"]').first().clear().type(vmsToBackup.join(','));
    cy.get('select').first().select(backupPreset);
    cy.get('input[type="time"]').first().clear().type(backupTime);

    cy.get('button').contains('Schedule Backup').click();

    cy.wait('@errBackup');
    cy.get('.alert').should('contain.text', 'Simulasi error backup');
  });

});
