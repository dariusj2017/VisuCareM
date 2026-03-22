/*
  File: main.js
  Location: /project-root/js/
  Purpose: Logic for the start page (index.html).
  Description:
    - Handles Adult/Child selection
    - Handles navigation to measurement pages
    - Prepares structure for future settings modal and customer management
*/

document.addEventListener("DOMContentLoaded", () => {

  const btnStart = document.getElementById("btnStart");
  const btnCustomers = document.getElementById("btnCustomers");

  const selAdult = document.getElementById("selAdult");
  const selChild = document.getElementById("selChild");

  selAdult.addEventListener("click", () => {
    selAdult.classList.add("active");
    selChild.classList.remove("active");
  });

  selChild.addEventListener("click", () => {
    selChild.classList.add("active");
    selAdult.classList.remove("active");
  });

  btnStart.addEventListener("click", () => {
    window.location.href = "front.html";
  });

  btnCustomers.addEventListener("click", () => {
    window.location.href = "customers.html";
  });

});
