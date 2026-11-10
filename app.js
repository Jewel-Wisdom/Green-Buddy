
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.firebasestorage.app",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
    getFirestore,
    collection,
    doc,
    setDoc,
    getDocs,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let plants = [];
let currentLeafPhoto = null;
let classifier = null;

function loadData() {
    const savedData = localStorage.getItem("my_plants");

    if (savedData !== null) {
        plants = JSON.parse(savedData);
    }

    showPlants();
}

function saveData() {
    localStorage.setItem("my_plants", JSON.stringify(plants));
}

function showPlants() {
    const plantList = document.getElementById("plantList");
    plantList.innerHTML = "";

    if (plants.length === 0) {
        plantList.innerHTML = "<li>No plants added yet</li>";
        return;
    }

    for (const plant of plants) {
        const li = document.createElement("li");

        if (plant.wateredToday) {
            li.classList.add("watered");
        }

        const name = document.createElement("div");
        name.className = "plant-name";
        name.textContent = plant.name;

        const details = document.createElement("div");
        details.className = "plant-details";
        details.textContent = plant.frequency + " | " + plant.notes;

        const buttons = document.createElement("div");
        buttons.className = "buttons";

        const waterButton = document.createElement("button");
        waterButton.textContent = "Mark as Watered";
        waterButton.onclick = () => markAsWatered(plant.id);

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";
        deleteButton.onclick = () => deletePlant(plant.id);

        buttons.appendChild(waterButton);
        buttons.appendChild(deleteButton);

        li.appendChild(name);
        li.appendChild(details);
        li.appendChild(buttons);

        plantList.appendChild(li);
    }
}

Webcam.set({
    width: 320,
    height: 240,
    image_format: "jpeg",
    jpeg_quality: 90
});

Webcam.attach("#my_camera");

window.captureLeafPhoto = function () {
    Webcam.snap(function (data_uri) {
        currentLeafPhoto = data_uri;

        document.getElementById("snapshot").innerHTML =
            '<img src="' + currentLeafPhoto + '">';

        predictLeafHealth();
    });
};

function loadModel() {
    const modelURL = "YOUR_MODEL_URL/model.json";

    classifier = ml5.imageClassifier(modelURL, function () {
        console.log("Model Loaded!");
        document.getElementById("status").textContent =
            "Status: Model ready";
    });
}

function predictLeafHealth() {
    if (!classifier || !currentLeafPhoto) {
        document.getElementById("healthPrediction").textContent =
            "Model is not ready yet.";
        return;
    }

    const image = document.querySelector("#snapshot img");

    classifier.classify(image, function (error, results) {
        if (error) {
            console.error(error);
            document.getElementById("healthPrediction").textContent =
                "Prediction failed.";
            return;
        }

        if (results && results.length > 0) {
            document.getElementById("healthPrediction").textContent =
                "Leaf Health: " + results[0].label;
        }
    });
}

window.addPlant = function () {
    const name = document.getElementById("plantName").value;
    const frequency = document.getElementById("waterFrequency").value;
    const notes = document.getElementById("plantNotes").value;

    if (!name || !frequency || !notes) {
        alert("Please fill in all fields.");
        return;
    }

    const plant = {
        id: Date.now().toString(),
        name: name,
        frequency: frequency,
        notes: notes,
        wateredToday: false
    };

    plants.push(plant);

    saveData();
    showPlants();

    document.getElementById("plantName").value = "";
    document.getElementById("waterFrequency").value = "";
    document.getElementById("plantNotes").value = "";

    saveToFirebase(plant);

    document.getElementById("status").textContent =
        "Status: Plant added";
};

window.markAsWatered = function (id) {
    for (const plant of plants) {
        if (plant.id === id) {
            plant.wateredToday = true;
            saveToFirebase(plant);
            break;
        }
    }

    saveData();
    showPlants();

    document.getElementById("status").textContent =
        "Status: Marked as Watered";
};

window.deletePlant = async function (id) {
    if (!confirm("Are you sure you want to delete this plant?")) {
        return;
    }

    const newPlants = [];

    for (const plant of plants) {
        if (plant.id !== id) {
            newPlants.push(plant);
        }
    }

    plants = newPlants;

    saveData();
    showPlants();

    await deleteFromFirebase(id);

    document.getElementById("status").textContent =
        "Status: Plant deleted";
};

async function saveToFirebase(plant) {
    try {
        await setDoc(doc(db, "plants", plant.id), plant);
        console.log("Plant saved successfully!");
    } catch (error) {
        console.error("Error saving plant:", error);
    }
}

async function deleteFromFirebase(id) {
    try {
        await deleteDoc(doc(db, "plants", id));
        console.log("Plant deleted successfully!");
    } catch (error) {
        console.error("Error deleting plant:", error);
    }
}

window.syncWithFirebase = async function () {
    document.getElementById("status").textContent =
        "Status: Syncing...";

    try {
        for (const plant of plants) {
            await saveToFirebase(plant);
        }

        const querySnapshot = await getDocs(collection(db, "plants"));

        plants = [];

        querySnapshot.forEach((document) => {
            plants.push(document.data());
        });

        saveData();
        showPlants();

        document.getElementById("status").textContent =
            "Status: Sync successful";
    } catch (error) {
        console.error("Sync error:", error);

        document.getElementById("status").textContent =
            "Status: Sync failed";
    }
};

loadData();
loadModel();
