// Audio Elements
const SCOTUSAudio = document.getElementById('scotus-audio');
const lofiAudio = document.getElementById('lofi-audio');

// Play/Pause Button Elements
const playPauseBtn = document.getElementById('play-pause-btn');
const playPauseIcon = document.getElementById('play-pause-icon');
const skipBtn = document.getElementById('skip-btn');


// Volume Control Sliders
const SCOTUSVolume = document.getElementById('scotus-volume');
const lofiVolume = document.getElementById('lofi-volume');

// Current Song Display
const songTitle = document.getElementById('song-title');



// Lofi Playlist
const lofiPlaylist = [
    { title: "Floater - Auxjack", src: "playlist/Floater.mp3" },
    { title: "Jazzy Wave - yourneighborsclassicbeats", src: "playlist/Jazzy Wave.mp3" },
    { title: "Deep Sea Treasures - sleepsleepsleep", src: "playlist/Deep Sea Treasures.mp3" },
    { title: "Chill - sleepsleepsleep", src: "playlist/Chill.mp3" },
    { title: "Rude - Eternal Youth", src: "playlist/Rude.mp3" },
];

// Track the current song index
let currentSongIndex = 0;
let isPlaying = false; // Track whether audio is playing




// Load the current song from the playlist
function loadSong(index) {
    lofiAudio.src = lofiPlaylist[index].src; // Set the audio source
    songTitle.textContent = lofiPlaylist[index].title ; // Update the displayed title
}

// Play the next song when the current one ends
function playNextSong() {
    currentSongIndex = (currentSongIndex + 1) % lofiPlaylist.length; // Loop back to the start
    loadSong(currentSongIndex);
    lofiAudio.play();
}

// Attach the 'ended' event listener to play the next song
lofiAudio.addEventListener('ended', playNextSong);

// Initialize the playlist on page load
loadSong(currentSongIndex);

// Play/Pause functionality
playPauseBtn.addEventListener('click', () => {
    if (!isPlaying) {
        SCOTUSAudio.play();
        lofiAudio.play();
        playPauseIcon.src = 'images/pauseiconfill.png'; // Change icon to "Pause"
        playPauseIcon.alt = 'Pause';
    } else {
        SCOTUSAudio.pause();
        lofiAudio.pause();
        playPauseIcon.src = 'images/playiconfill.png'; // Change icon to "Play"
        playPauseIcon.alt = 'Play';
    }
    isPlaying = !isPlaying; // Toggle play state
});

skipBtn.addEventListener('click', () => {
    playNextSong(); // Call the playNextSong function
    if (!isPlaying) {
        // If playback isn't active, start playback
        lofiAudio.play();
        SCOTUSAudio.play();
        playPauseIcon.src = 'images/pauseiconfill.png'; // Change icon to "Pause"
        playPauseIcon.alt = 'Pause';
        isPlaying = true; // Update the playback state
    }
});

// Adjust volume for weather audio
SCOTUSVolume.addEventListener('input', (e) => {
    SCOTUSAudio.volume = e.target.value;
});

// Adjust volume for lofi audio
lofiVolume.addEventListener('input', (e) => {
    lofiAudio.volume = e.target.value;
});

// Function to update the clock
function updateClock() {
    const clockElement = document.getElementById('clock');
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    clockElement.textContent = `${hours}:${minutes}`; // Display time in HH:MM format
}
const clock = document.getElementById('clock');


// Update the clock text dynamically
function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    clock.textContent = `${hours}:${minutes}`;
    clock.setAttribute('data-time', `${hours}:${minutes}`); // For chromatic effect
}

// Update the clock every second
setInterval(updateClock, 1000);
updateClock(); // Initialize on page load

// Select all sliders
const sliders = document.querySelectorAll('input[type="range"]');

// Function to update the slider's gradient based on its value
const updateSliderBackground = (slider) => {
    const value = (slider.value / slider.max) * 100; // Calculate percentage
    slider.style.background = `linear-gradient(to right, white ${value}%, rgba(0, 0, 0, 0.2) ${value}%)`; // Update gradient
};

// Attach event listener to dynamically update the background
sliders.forEach(slider => {
    // Initialize background on page load
    updateSliderBackground(slider);

    // Update background dynamically on input (thumb movement)
    slider.addEventListener('input', () => updateSliderBackground(slider));
});

SCOTUSVolume.addEventListener('input', (e) => {
    SCOTUSAudio.volume = e.target.value;
});

lofiVolume.addEventListener('input', (e) => {
    lofiAudio.volume = e.target.value;
});

// Add change events for better mobile support
SCOTUSVolume.addEventListener('change', (e) => {
    SCOTUSAudio.volume = e.target.value;
});

lofiVolume.addEventListener('change', (e) => {
    lofiAudio.volume = e.target.value;
});


// Array of radio channels
const radioChannels = [

    { name: "Trump v. CASA", src: "https://www.supremecourt.gov/media/audio/mp3files/24A884.mp3" },
    { name: "Medina v. Planned Parenthood South Atlantic", src: "https://www.supremecourt.gov/media/audio/mp3files/23-1275.mp3" },    
    { name: "Ames v. OH Dept. of Youth Services", src: "https://www.supremecourt.gov/media/audio/mp3files/23-1039.mp3" },    
    { name: "TikTok, Inc. v. Garland", src: "https://www.supremecourt.gov/media/audio/mp3files/24-656.mp3" },
    { name: "FDA v. Wages and White Lion", src: "https://www.supremecourt.gov/media/audio/mp3files/23-1038.mp3" },
    { name: "United States v. Miller", src: "https://www.supremecourt.gov/media/audio/mp3files/23-824.mp3" },  
    { name: "Hungary v. Simon", src: "https://www.supremecourt.gov/media/audio/mp3files/23-867.mp3" },
    { name: "United States v. Skrmetti", src: "https://www.supremecourt.gov/media/audio/mp3files/23-477.mp3" },
    { name: "Kousisis v. United States", src: "https://www.supremecourt.gov/media/audio/mp3files/23-909.mp3" },
    { name: "Feliciano v. Dept. of Transportation", src: "https://www.supremecourt.gov/media/audio/mp3files/23-861.mp3" },
    { name: "Seven County Coalition v. Eagle County", src: "https://www.supremecourt.gov/media/audio/mp3files/23-975.mp3" },
    { name: "Dewberry Group, Inc. v. Dewberry Engineers Inc.", src: "https://www.supremecourt.gov/media/audio/mp3files/23-900.mp3" }
 ]

// Select the dropdown and audio element
const channelSelect = document.getElementById("channel-select");
const argumentAudio = document.getElementById("scotus-audio");

// Populate the dropdown menu
radioChannels.forEach((channel, index) => {
    const option = document.createElement("option");
    option.value = index; // Use the index to identify the channel
    option.textContent = channel.name; // Display the channel name
    channelSelect.appendChild(option);
});

// Function to change the radio channel
function changeChannel(index) {
    const selectedChannel = radioChannels[index];
    if (selectedChannel) {
        argumentAudio.src = selectedChannel.src; // Update the audio source
    }

    if (isPlaying) {
        // If playback isn't active, start playback
        lofiAudio.play();
        SCOTUSAudio.play();
        playPauseIcon.src = 'images/pauseiconfill.png'; // Change icon to "Pause"
        playPauseIcon.alt = 'Pause';
        isPlaying = true; // Update the playback state
    }
}

// Listen for selection changes
channelSelect.addEventListener("change", (e) => {
    changeChannel(e.target.value);
});

// Initialize the first channel
changeChannel(0); // Default to the first channel


