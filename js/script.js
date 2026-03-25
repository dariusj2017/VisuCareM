// Paleidžiam kamerą
const video = document.getElementById("video");
const canvas = document.getElementById("photoCanvas");
const ctx = canvas.getContext("2d");

navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
        video.srcObject = stream;
    });

// Gulsčiuko logika
window.addEventListener("deviceorientation", (e) => {
    const roll = e.gamma; // pasukimas į šoną

    let color = "red";
    if (Math.abs(roll) <= 5) color = "green";
    else if (Math.abs(roll) <= 10) color = "yellow";

    document.getElementById("h-line").style.backgroundColor = color;
});

// Fotografavimas
document.getElementById("captureBtn").addEventListener("click", () => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Nupiešiam video į canvas
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(Math.PI); // 180° apvertimas
    ctx.drawImage(video, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
    ctx.restore();

    // Perjungiam vaizdus
    video.style.display = "none";
    canvas.style.display = "block";

    // Paslepiam gulsčiuką ir kryžiukus
    document.getElementById("h-line").style.display = "none";
    document.getElementById("cross-left").style.display = "none";
    document.getElementById("cross-right").style.display = "none";
});

// Iš naujo
document.getElementById("resetBtn").addEventListener("click", () => {
    canvas.style.display = "none";
    video.style.display = "block";

    document.getElementById("h-line").style.display = "block";
    document.getElementById("cross-left").style.display = "block";
    document.getElementById("cross-right").style.display = "block";
});