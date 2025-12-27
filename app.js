const wallContainer = document.querySelector("#wall-container");
const wall = document.querySelector("#wall");

const TOLERANCE = 10;
let holds = [];

function drawCircle(x, y, index) {
    const circle = document.createElement("div");
    circle.classList.add("hold");
    circle.style.left = `${x - 25}px`;
    circle.style.top = `${y - 25}px`;
    circle.dataset.index = index; 
    wallContainer.appendChild(circle);
}
 
// Adding and removing holds

wall.addEventListener("click", (e) => {
    // console.log(`Offset X/Y: ${wall.offsetX}, ${wall.offsetY}`);

    const rect = wall.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const exists = holds.some(hold => 
        Math.abs(hold.x - x) < TOLERANCE && 
        Math.abs(hold.y - y) < TOLERANCE
    );

    if (!exists) {
        holds.push({ x, y });
        drawCircle(x, y, holds.length - 1);
    }

    console.log(holds);
});

wall.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    
    const rect = wall.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const index = holds.findIndex(hold => 
        Math.abs(hold.x - x) < TOLERANCE + 5 && 
        Math.abs(hold.y - y) < TOLERANCE + 5
    );
    
    if (index !== -1) {
        holds.splice(index, 1);
        
        const circles = document.querySelectorAll(".hold");
        circles[index]?.remove();
        
        // Re-index remaining circles
        document.querySelectorAll(".hold").forEach((circle, i) => {
            circle.dataset.index = i;
        });
    }
    
    console.log(holds);
});

// Saving and loading climbs

document.querySelector("#save-btn").addEventListener("click", saveClimb);
document.querySelector("#load-btn").addEventListener("click", loadClimb);
document.querySelector("#clear-saves-btn").addEventListener("click", clearAllSaves);

function saveClimb() {
    let name = prompt("What do you want to name this climb?");

    if (name === null || name.trim() === "") {
        alert("Climb not saved. Please provide a valid name.");
        return;
    }

    name = name.trim();
    localStorage.setItem(name, JSON.stringify(holds));
    // alert(`Climb "${name}" saved!`);
}

function listClimbs() {
    const climbs = [];
    for (let i = 0; i < localStorage.length; i++) {
        climbs.push(localStorage.key(i));
    }
    return climbs;
}

function loadClimb() {
    const climbs = listClimbs();
    
    if (climbs.length === 0) {
        alert("No saved climbs found.");
        return;
    }
    
    const list = climbs.join("\n");

    let name = prompt(`Available climbs:\n${list}\n\nEnter climb name to load:`);
    
    if (name === null || name.trim() === "") {
        alert("No climb loaded.");
        return;
    }
    
    name = name.trim();
    const saved = localStorage.getItem(name);
    
    if (saved) {
        // Clear existing holds
        holds = [];
        document.querySelectorAll(".hold").forEach(circle => circle.remove());
        
        // Load new holds
        holds = JSON.parse(saved);
        holds.forEach((hold, index) => drawCircle(hold.x, hold.y, index));
        
        alert(`Loaded climb: ${name}`);
    } else {
        alert(`Climb "${name}" not found.`);
    }
}

function clearAllSaves() {
    if (confirm("Are you sure you want to delete ALL saved climbs?")) {
        localStorage.clear();
        alert("All saves cleared!");
    }
}

// Modals for saving/loading 

// const saveDialog = document.querySelector("#save-dialog");

// document.querySelector("#save-btn").addEventListener("click", () => {
//   saveDialog.showModal();
// });

// document.querySelector("#load-btn").addEventListener("click", () => {
//   loadDialog.showModal();
//   // populate climb list here
// });


// function saveClimb() {
//     document.querySelector("#save-dialog form").addEventListener("submit", (e) => {
//         e.preventDefault();
//         const name = document.querySelector("#climb-name").value.trim();
        
//         if (name === "") {
//             return; // or show error message in UI
//         }
        
//         localStorage.setItem(name, JSON.stringify(holds));
//         saveDialog.close();
//         document.querySelector("#climb-name").value = ""; // clear input
//     });
// }