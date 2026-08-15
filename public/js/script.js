// Example starter JavaScript for disabling form submissions if there are invalid fields
(() => {
  'use strict'

  // Fetch all the forms we want to apply custom Bootstrap validation styles to
  const forms = document.querySelectorAll('.needs-validation')

  // Loop over them and prevent submission
  Array.from(forms).forEach(form => {
    form.addEventListener('submit', event => {
      if (!form.checkValidity()) {
        event.preventDefault()
        event.stopPropagation()
      }

      form.classList.add('was-validated')
    }, false)
  })
})()

// Preserve category filter when searching
document.addEventListener('DOMContentLoaded', function() {
  const searchForm = document.querySelector('.search-form');
  if (searchForm) {
    searchForm.addEventListener('submit', function(e) {
      const urlParams = new URLSearchParams(window.location.search);
      const category = urlParams.get('category');
      
      if (category) {
        // Create a hidden input to preserve category
        const hiddenInput = document.createElement('input');
        hiddenInput.type = 'hidden';
        hiddenInput.name = 'category';
        hiddenInput.value = category;
        searchForm.appendChild(hiddenInput);
      }
    });
  }
});