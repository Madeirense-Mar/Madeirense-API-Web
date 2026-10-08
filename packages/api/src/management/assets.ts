/**
 * Served as /api/management/assets/app.js — external because Helmet's CSP
 * blocks inline scripts. Progressive enhancement only.
 */
export const MANAGEMENT_APP_JS = `
document.addEventListener('click', function (event) {
  var button = event.target.closest('[data-copy]');
  if (!button) return;
  var input = document.querySelector(button.getAttribute('data-copy'));
  if (!input) return;
  input.select();
  (navigator.clipboard ? navigator.clipboard.writeText(input.value) : Promise.reject())
    .catch(function () { document.execCommand('copy'); })
    .finally(function () {
      var label = button.textContent;
      button.textContent = 'Copied';
      setTimeout(function () { button.textContent = label; }, 1500);
    });
});
document.addEventListener('submit', function (event) {
  var message = event.target.getAttribute('data-confirm');
  if (message && !window.confirm(message)) event.preventDefault();
});
`;
