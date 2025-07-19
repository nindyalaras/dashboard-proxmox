describe('E2E Test: Login & Logout Dashboard', () => {
  const baseUrl = 'http://localhost:3000';

  beforeEach(() => {
    cy.visit(baseUrl); // buka dashboard
    cy.clearLocalStorage();
  });

  it('Login gagal jika username tidak terdaftar', () => {
    cy.contains('Login Admin');
    cy.get('input[placeholder="Username"]').type('user_tidak_ada');
    cy.get('input[placeholder="Password"]').type('salah');
    cy.get('button').contains('Login').click();
    cy.contains('User tidak ditemukan');
  });

  it('Login gagal jika password salah', () => {
    cy.get('input[placeholder="Username"]').type('admin');
    cy.get('input[placeholder="Password"]').type('passwordsalah');
    cy.get('button').contains('Login').click();
    cy.contains('Password salah');
  });

  it('Login sukses dengan user valid, bisa akses dashboard & logout', () => {
    cy.get('input[placeholder="Username"]').type('admin');
    cy.get('input[placeholder="Password"]').type('tes123');
    cy.get('button').contains('Login').click();

    cy.contains('Proxmox Dashboard');
    cy.contains('Logout').click();

    cy.contains('Login Admin');
    cy.get('input[placeholder="Username"]');
  });

  it('Login gagal jika field kosong', () => {
    cy.get('button').contains('Login').click();
    cy.contains('Username & password wajib diisi');
  });

  it('Login dengan user baru hasil register', () => {
    // Register via backend API
    const unique = Date.now();
    cy.request('POST', 'http://localhost:8091/api/auth/register', {
      username: `admin_cypress_${unique}`,
      password: 'pass_cypress'
    }).then(() => {
      cy.visit(baseUrl); // Reload setelah register
      cy.get('input[placeholder="Username"]').type('admin_cypress');
      cy.get('input[placeholder="Password"]').type('pass_cypress');
      cy.get('button').contains('Login').click();
      cy.contains('Proxmox Dashboard');
      cy.contains('Logout').click();
      cy.contains('Login Admin');
    });
  });
});
