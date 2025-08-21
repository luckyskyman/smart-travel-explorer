
const axios = require('axios');

// CORS를 허용하고 API 요청을 처리하는 핸들러 함수
module.exports = async (req, res) => {
    // Vercel 배포 환경에서는 자동으로 CORS를 처리해주지만, 로컬 개발 환경 등을 위해 헤더를 설정합니다.
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // OPTIONS 요청(pre-flight)에 대한 처리
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    console.log('--- [API] Received a request ---');

    // 환경 변수에서 API 키를 가져옵니다. Vercel 프로젝트 설정에서 이 변수를 추가해야 합니다.
    const TOUR_API_KEY = process.env.TOUR_API_KEY;

    if (!TOUR_API_KEY) {
        console.error('[API] TOUR_API_KEY is not set in environment variables.');
        return res.status(500).json({ error: '서버에 API 키가 설정되지 않았습니다. 관리자에게 문의하세요.' });
    }

    const keyword = req.query.keyword || '서울';
    console.log(`[API] Keyword received: "${keyword}"`);

    const apiUrl = `http://apis.data.go.kr/B551011/KorService2/searchKeyword2?serviceKey=${TOUR_API_KEY}&keyword=${encodeURIComponent(keyword)}&MobileOS=ETC&MobileApp=SmartTravel&_type=json&arrange=A`;
    console.log(`[API] Calling TourAPI with URL: ${apiUrl}`);

    try {
        const response = await axios.get(apiUrl);
        console.log('[API] Successfully received response from TourAPI.');

        if (typeof response.data === 'string' && response.data.includes('<errMsg>SERVICE ERROR</errMsg>')) {
            console.error('[API] TourAPI returned a service error. The API key is likely invalid.');
            return res.status(500).json({ error: '한국관광공사 API 키가 유효하지 않습니다.' });
        }
        
        const items = response.data.response?.body?.items?.item;

        if (!items) {
            console.log('[API] No items found in the API response. Sending empty array.');
            return res.json([]);
        }
        console.log(`[API] Found ${Array.isArray(items) ? items.length : 1} items. Processing and sending to frontend.`);

        const destinations = (Array.isArray(items) ? items : [items]).map(item => ({
            id: item.contentid,
            name: item.title,
            image: item.firstimage || `https://via.placeholder.com/400x300.png?text=${encodeURIComponent(item.title)}`,
            category: [item.cat1, item.cat2, item.cat3].filter(c => c),
            address: item.addr1,
            coordinates: {
                lat: parseFloat(item.mapy),
                lng: parseFloat(item.mapx)
            },
            suitableFor: ['친구', '가족', '연인', '혼자'],
            aiScore: Math.floor(Math.random() * 30) + 70,
            reason: `${item.title}, 추천 여행지입니다.`,
            weather: '정보 없음',
            temperature: 'N/A',
            congestion: '정보 없음',
            bestTime: '정보 없음'
        }));

        res.json(destinations);

    } catch (error) {
        console.error('[API] !!! An error occurred while fetching from TourAPI !!!');
        if (error.response) {
            console.error('[API] Error Data:', error.response.data);
            console.error('[API] Error Status:', error.response.status);
        } else if (error.request) {
            console.error('[API] Error Request:', error.request);
        } else {
            console.error('[API] Error Message:', error.message);
        }
        res.status(500).json({ error: '외부 API에서 데이터를 가져오는 데 실패했습니다.' });
    }
};
