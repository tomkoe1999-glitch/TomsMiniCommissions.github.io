const contactForm = document.querySelector("#contact-form");
const formStatus = document.querySelector("#form-status");
const submitButton = contactForm.querySelector('button[type="submit"]');
const defaultButtonText = submitButton.textContent;

contactForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!contactForm.reportValidity()) {
    return;
  }

  formStatus.textContent = "Sending your request…";
  formStatus.className = "form-status";
  contactForm.setAttribute("aria-busy", "true");
  submitButton.disabled = true;
  submitButton.textContent = "Sending…";

  try {
    const response = await fetch(contactForm.action, {
      method: "POST",
      body: new FormData(contactForm),
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("The form service rejected the request.");
    }

    contactForm.reset();
    formStatus.textContent = "Thank you. Your commission request has been sent.";
    formStatus.className = "form-status is-success";
  } catch (error) {
    formStatus.textContent = "Your request could not be sent. Please try again in a moment.";
    formStatus.className = "form-status is-error";
  } finally {
    contactForm.removeAttribute("aria-busy");
    submitButton.disabled = false;
    submitButton.textContent = defaultButtonText;
  }
});
