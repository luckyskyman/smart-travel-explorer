document.addEventListener('DOMContentLoaded', () => {
    // --- Initial Setup ---
    loadDestinations('서울'); // Load initial data for "Seoul"
    setupEventListeners();
    setupModalListeners(); // Set up listeners for the map modal
});

// --- Global State ---
let allDestinations = [];
const userProfile = {
    style: null,
    companion: null,
    budget: 50
};
// IMPORTANT: Replace with your own Google Maps API Key
const GOOGLE_MAPS_API_KEY = 'YOUR_API_KEY_HERE'; 

// --- Event Listeners Setup ---
function setupEventListeners() {
    // Search functionality
    const searchButton = document.getElementById('search-button');
    searchButton.addEventListener('click', handleSearch);

    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            handleSearch();
        }
    });

    // Profile settings functionality
    const styleButtons = document.querySelectorAll('#travel-style .profile-btn');
    styleButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            handleProfileSelection(e, 'style', styleButtons);
        });
    });

    const companionButtons = document.querySelectorAll('#companion-type .profile-btn');
    companionButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            handleProfileSelection(e, 'companion', companionButtons);
        });
    });

    const budgetSlider = document.getElementById('budget-slider');
    budgetSlider.addEventListener('input', (e) => {
        const budgetValue = e.target.value;
        document.getElementById('budget-value').textContent = budgetValue;
        userProfile.budget = parseInt(budgetValue, 10);
        applyAIRecommendations();
    });
}

function setupModalListeners() {
    const modal = document.getElementById('map-modal');
    const closeButton = document.querySelector('.close-button');

    closeButton.onclick = () => {
        modal.style.display = "none";
    }

    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }
}

// --- Data Loading ---
async function loadDestinations(keyword = '서울') {
    try {
        // Use template literals to build the URL with the keyword
        const response = await fetch(`/api/destinations?keyword=${keyword}`);
        const destinations = await response.json();

        if (response.ok) {
            allDestinations = destinations.map(dest => ({ ...dest, originalScore: dest.aiScore }));
            applyAIRecommendations();
        } else {
            // If the server returns an error, log it and display a message
            console.error('Failed to load destinations:', destinations.error);
            alert('여행지 정보를 불러오는 데 실패했습니다: ' + destinations.error);
        }
    } catch (error) {
        console.error('여행지 정보를 불러오는 데 실패했습니다:', error);
        alert('서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.');
    }
}

// --- AI Recommendation Logic ---
function applyAIRecommendations() {
    const scoredDestinations = allDestinations.map(destination => {
        let score = destination.originalScore;
        if (userProfile.style && destination.category.includes(userProfile.style)) {
            score += 40;
        }
        if (userProfile.companion && destination.suitableFor.includes(userProfile.companion)) {
            score += 20;
        }
        destination.aiScore = Math.min(score, 150); 
        return destination;
    });

    scoredDestinations.sort((a, b) => b.aiScore - a.aiScore);
    displayDestinations(scoredDestinations);
}

// --- Display Logic ---
function displayDestinations(destinations) {
    const container = document.getElementById('cards-container');
    container.innerHTML = '';

    destinations.forEach(destination => {
        const card = createDestinationCard(destination);
        const mapButton = card.querySelector('.map-btn');
        mapButton.addEventListener('click', () => {
            showMapModal(destination);
        });
        container.appendChild(card);
    });

    // Initialize VanillaTilt on all card elements
    // VanillaTilt.init(document.querySelectorAll(".card"), {
	// 	max: 15,
	// 	speed: 400,
    //     glare: true,
    //     "max-glare": 0.5
	// });
}

function createDestinationCard(destination) {
    const card = document.createElement('div');
    card.className = 'card';
    
    let reason = destination.reason;
    if (userProfile.style && destination.category.includes(userProfile.style)) {
        reason = `'${userProfile.style}' 스타일에 꼭 맞는 여행지!`;
    } else if (userProfile.companion && destination.suitableFor.includes(userProfile.companion)) {
        reason = `'${userProfile.companion}'과(와) 함께하기 좋은 곳!`;
    }

    card.innerHTML = `
        <img src="${destination.image}" alt="${destination.name}" style="width:100%; height:auto; border-radius: 16px 16px 0 0;" loading="lazy">
        <div class="card-content">
            <h3>${destination.name}</h3>
            <p class="ai-score">AI 추천도: ${'⭐'.repeat(Math.floor(destination.aiScore / 30))} (${destination.aiScore}점)</p>
            <p class="ai-reason">"${reason}"</p>
            <div class="real-time-info">
                <p>날씨: ${destination.weather} ${destination.temperature}</p>
                <p>혼잡도: ${destination.congestion}</p>
                <p>방문 최적 시간: ${destination.bestTime}</p>
            </div>
            <button class="map-btn">지도 보기</button>
        </div>
    `;
    
    return card;
}

// --- Modal Logic ---
function showMapModal(destination) {
    const modal = document.getElementById('map-modal');
    const title = document.getElementById('map-modal-title');
    const mapContainer = document.getElementById('map-container');

    title.textContent = destination.name;
    
    if (GOOGLE_MAPS_API_KEY === 'YOUR_API_KEY_HERE') {
        mapContainer.innerHTML = '<p style="text-align:center; padding-top: 50px;">Google Maps API 키를 입력해야 지도가 표시됩니다.</p>';
    } else {
        const lat = destination.coordinates.lat;
        const lng = destination.coordinates.lng;
        mapContainer.innerHTML = `<iframe src="https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY}&q=${lat},${lng}" allowfullscreen></iframe>`;
    }

    modal.style.display = "block";
}


// --- Event Handlers ---
function handleSearch() {
    const searchTerm = document.getElementById('search-input').value;
    loadDestinations(searchTerm);
}

function handleProfileSelection(event, type, buttons) {
    const clickedButton = event.target;
    if (clickedButton.classList.contains('active')) {
        clickedButton.classList.remove('active');
        userProfile[type] = null;
    } else {
        buttons.forEach(btn => btn.classList.remove('active'));
        clickedButton.classList.add('active');
        userProfile[type] = clickedButton.dataset[type];
    }
    applyAIRecommendations();
}