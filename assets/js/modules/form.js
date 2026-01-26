const FORM_ENDPOINT = 'https://script.google.com/macros/s/AKfycby9Wl5NkOsqpnwpltSUX6-XNYsGp8VSiPpKQNTTGDuwslXsTs5-vVsJ4Ufi4oFrz4g/exec';

export function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  const statusEl = form.querySelector('.form-status');
  if (!statusEl) return;

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    statusEl.innerHTML = `
      <span class="loader">
        <span class="letter">📧</span>
        Envoi en cours...
      </span>
    `;

    statusEl.style.color = '#1D4ED8';

    const formData = new FormData(form);

    fetch(FORM_ENDPOINT, {
      method: 'POST',
      body: formData,
    })
      .then(response => response.json())
      .then((res) => {
        if (!res || !res.ok) {
          statusEl.innerText = (res && res.error) ? res.error : "Erreur lors de l'envoi ❌ Réessayez.";
          statusEl.style.color = '#F44336';
          return;
        }

        statusEl.innerText = 'Votre message a bien été envoyé ✅';
        statusEl.style.color = '#93beab';
        form.reset();
      })
      .catch(() => {
        statusEl.innerText = "Erreur lors de l'envoi ❌ Réessayez.";
        statusEl.style.color = '#F44336';
      });
  });
}
