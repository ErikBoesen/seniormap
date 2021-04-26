var map, popup, Popup, markers = [];
const elements = {
    map: document.getElementById('map'),
    options: {
        year: document.getElementById('option-year'),
        pan: document.getElementById('option-pan'),
        precedence: document.getElementById('option-precedence'),
    }
}

var today = new Date();
// The yearActivationMonth determines the month that a specific year becomes
// the default in the selectYear dropdown. Currently, 2 (March 15th) is used
var yearActivationMonth = 2;
var currentYear = new Date(
    today.getFullYear(),
    today.getMonth() - yearActivationMonth,
    today.getDate() - 14
).getFullYear().toString();
// Using a default select option prevents a jump in the width of the select element
var defaultSelectOption = document.createElement('option');
defaultSelectOption.textContent = currentYear;
elements.options.year.appendChild(defaultSelectOption);

var panToMarkers = true;
var popupOpen = false;

var institutionDataSheet = '1qEcBuuRtQT-hE_JyX6SlMxTodvXCtAXX1LSB4ABBlXU';
var dataDocumentsSheet = '1VZmrdC-rm6noqxMoFWiPimOiM3-zmhk5kOmJ8RppU9w';
var dataDocuments = new Map([
    ['2019', '18JTbEUmTiUCMbazqj593Q6QNfpQZbjSiKUpHrWF9EGc'],
    ['2020', '1aPQuyvb8Y1SH37kkD1eVFftkscHB63cnU92HQeuR9n4'],
    ['2021', '1Puj3Apgo7cK5AD-x25RTvHUbs9yGzdtBZUFsp13-z0k'],
]);
var stats = new Map();

var logos = new Map();  // Institution Name => Logo URL
var coordinates = new Map();  // Institution Name => { lat, lng }
var students = new Map();  // Year => List of students

// Called by Maps API upon loading.
function initMap() {
    definePopupClass();

    map = new google.maps.Map(elements.map, { // Define Map Settings
        center: {
            lat: 35,
            lng: -98
        },
        zoom: 4,
        disableDefaultUI: true,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        rotateControl: false,
        fullscreenControl: true,
        backgroundColor: '#333333',
        styles: mapStyles
    });

    Promise.all([
        fetchDataDocuments(),
        fetchInstitutionData(),
        // Student data is fetched again in displayMap, so if the sheet ID
        // wasn't already in the students Map, the one from the dataDocument is used
        fetchStudentData(currentYear)
    ]).then(() => displayMap(currentYear, true));
}

async function fetchDataDocuments() {
    const tabletop = await fetchTabletopData(dataDocumentsSheet);
    // Clear defaultSelectOption
    elements.options.year.innerHTML = '';
    for (let dataDocument of tabletop.sheets('main').all()) {
        dataDocuments.set(dataDocument['Year'], dataDocument['Datasheet URL']);

        let option = document.createElement('option');
        option.textContent = dataDocument['Year'];
        if (dataDocument['Year'] == currentYear) {
            option.selected = true;
        }

        elements.options.year.prepend(option);
    }

    for (let yearStats of tabletop.sheets('stats').all()) {
        stats.set(yearStats['Year'], yearStats);
        delete yearStats['Year'];
    }
}

async function fetchInstitutionData() {
    const tabletop = await fetchTabletopData(institutionDataSheet);
    // Turn 2D list into easily-subscriptable object
    for (let institution of tabletop.sheets('coordinates').all()) {
        coordinates.set(institution['Name'], {
            lat: parseFloat(institution['lat']),
            lng: parseFloat(institution['lng']),
        });
    }

    for (let logo of tabletop.sheets('logos').all()) {
        logos.set(logo['Name'], logo['Logo']);
    }
}

async function fetchStudentData(year) {
    if (students.has(year) || !dataDocuments.has(year)) {
        clearMarkers();
        return Promise.resolve();
    }

    const tabletop = await fetchTabletopData(dataDocuments.get(year));
    clearMarkers();
    students.set(year, tabletop.sheets('raw').all());
}

function fetchTabletopData(sheetID) {
    var fetchFunction = function fetchData(resolve, reject) {
        Tabletop.init({
            key: sheetID,
            error: reject,
            callback: function(_, tabletop) {
                resolve(tabletop);
            },
            simpleSheet: true
        });
    }

    return new Promise(fetchFunction);
}

function displayMap(year, firstLoad) {
    elements.map.classList.add('loading');
    clearPopups();
    hideStatisticsPanel();

    Promise.all([
        // Minimum delay of 300ms if not the first load
        Promise.all([
            fetchStudentData(year),
            sleep(firstLoad ? 0 : 300)
        ])
            .then(() => buildInstitutionData(year))
            .then((institutions) => placeMarkers(institutions))
            .then(() => loadStatistics(year, stats)),
        // Either the transition ends or its time is up
        Promise.race([
            transitionEnd(elements.map, 'filter'),
            sleep(firstLoad ? 0 : 750)  // 0 if the first load since initial fetch took time
        ])
    ]).then(function() {
        elements.map.classList.remove('loading');
    });
}

function clearPopups() {
    if (popup) popup.setMap(null);
}

function buildInstitutionData(year) {
    var institutions = {};
    // TODO: Stop getting sheet data in array
    for (student of students.get(year)) {
        if (!institutions[student['Institution name']]) { // If the institution isn't already in the object
            if (!coordinates.has(student['Institution name'])) {
                console.error('No location data found for Institution: ' + student['Institution name']);
            }

            institutions[student['Institution name'].trim()] = {
                name: student['Institution name'].trim(),
                students: [],
                position: coordinates.get(student['Institution name'].trim()),
            }
        }
        institutions[student['Institution name'].trim()].students.push({
            name: student['First name'].trim() + ' ' + student['Last name'].trim(),
            major: student['Intended major(s) or field(s) of study'].trim(),
        });
    }

    for ([ institutionName, logoURL ] of logos) {
        if (institutions[institutionName]) {
            institutions[institutionName].logo = logoURL;
        }
    }

    return institutions;
}

function placeMarkers(institutions) {
    for (name in institutions) {
        let marker = new google.maps.Marker(institutions[name]);
        google.maps.event.addListener(marker, 'click', function() {
            details(this);

            if (panToMarkers) {
                var scale = 1 / (1 << map.getZoom());
                var worldCoordinate = map.getProjection().fromLatLngToPoint(marker.position);
                var defaultOffset = 80 * scale;
                var offsetPerStudent = 40 * scale;

                worldCoordinate.y -= defaultOffset +
                    (offsetPerStudent * Math.min(5, this.students.length));
                worldCoordinate.y = Math.max(0, worldCoordinate.y);

                var latLng = map.getProjection().fromPointToLatLng(worldCoordinate);
                map.panTo(latLng);
            }
        });
        marker.setMap(map);
        markers.push(marker);
    }
    setMarkerPrecedence(elements.options.precedence.value == 'Bottom');
}

function clearMarkers() {
    for (marker of markers) {
        marker.setMap(null);
    }
    markers = [];
}

function details(institution) {
    clearPopups();
    var info = document.createElement('div');
    var institutionContainer = document.createElement('div');
    institutionContainer.className = 'institution-container';
    var institutionName = document.createElement('h3'),
        institutionLogo = document.createElement('img');
    institutionName.textContent = institution.name;
    institutionLogo.src = institution.logo || '';
    institutionLogo.alt = institution.name + ' Logo';
    institutionContainer.appendChild(institutionName);
    institutionContainer.appendChild(institutionLogo);
    info.appendChild(institutionContainer);
    var studentsList = document.createElement('div');
    studentsList.className = 'students-list';
    for (student of institution.students) {
        var studentPhoto = document.createElement('img'),
            studentName = document.createElement('p'),
            studentMajor = document.createElement('p');
        studentPhoto.src = 'portraits/' + currentYear + '/' + student.name + '.jpg';
        imageExists(studentPhoto.src, function(exists) {
            if (!exists) {
                studentPhoto.src = 'portraits/blankHead.png';
            }
        });
        studentPhoto.alt = student.name + ' portrait';
        studentPhoto.draggable = false;
        studentName.textContent = student.name;
        studentName.className = 'student-name';
        studentMajor.textContent = student.major;
        studentMajor.className = 'student-major';
        var studentContainer = document.createElement('div');
        studentContainer.className = 'student-container';
        studentContainer.appendChild(studentPhoto);
        studentContainer.appendChild(studentName);
        studentContainer.appendChild(studentMajor);
        studentsList.appendChild(studentContainer);
    }
    info.appendChild(studentsList);
    info.style.setProperty('--num-columns', Math.ceil(studentsList.children.length / 5));
    popup = new Popup(new google.maps.LatLng(institution.position.lat(), institution.position.lng()), info);
    popup.setMap(map);
    console.log('Adding popup');
    popupOpen = true;
}

function imageExists(url, callback) {
    var img = new Image();
    img.onload = function() { callback(true); };
    img.onerror = function() { callback(false); };
    img.src = url;
  }

var dragged = false;

onmousedown = onDragReset;
ontouchstart = onDragReset;

onmousemove = onDragStart;
ontouchmove = onDragStart;

onmouseup = onDragEnd;
ontouchend = onDragEnd;

function onDragReset() {
    dragged = false;
}

function onDragStart() {
    dragged = true;
}

function onDragEnd(e) {
    // Check that we're not clicking a marker and that there was no dragging
    if (e.target.tagName != 'IMG'
        && dragged == false) {
        clearPopups();
    }
    dragged = false;
}

onkeydown = function(e) {
    if (e.key === 'Escape') {
        clearPopups();
    }
}

elements.options.year.addEventListener('change', function(event) {
    if (currentYear != event.target.value) {
        currentYear = event.target.value;
        displayMap(currentYear);
    }
});

elements.options.pan.addEventListener('click', function(event) {
    panToMarkers = event.target.checked;
});

elements.options.precedence.addEventListener('change', function(event) {
    setMarkerPrecedence(event.target.value == 'Bottom');
});

function setMarkerPrecedence(bottom) {
    let bottomMultiplier = bottom ? -1 : 1;

    let sortFunction = function(a, b) {
        let aPos = a.position || {lat: () => 0};
        let bPos = b.position || {lat: () => 0};

        return bottomMultiplier * (aPos.lat() - bPos.lat());
    };
    markers.sort(sortFunction);

    for (var i = 0; i < markers.length; i++) {
        markers[i].setZIndex(i);
    }
}

function transitionEnd(element, transitionProperty) {
    return new Promise(function(resolve, _) {
        var callback = function(event) {
            if (event.propertyName === transitionProperty) {
                element.removeEventListener('transitionend', callback);
                resolve();
            }
        };
        element.addEventListener('transitionend', callback);
    });
}

function sleep(millis) {
    return new Promise((resolve, _) => setTimeout(resolve, millis));
}

function debugInstitutionLogos() {
    for (let year of dataDocuments.keys()) {
        if (!students.get(year)) continue;

        for (let student of students.get(year)) {
            if (!logos.has(student['Institution name'])) {
                console.warn('No logo found for Institution: ' + student['Institution name']);
            }
        }
    }
}

function debugPortraits() {
    for (student of students.get(currentYear)) {
        fetch('portraits/' + currentYear + '/' + student['First name'] + ' ' + student['Last name']  + '.jpg')
                .catch(() => console.err('Portrait not found for Student: ' + student.name));
    }
}

var mapStyles = [
    {
        featureType: 'water',
        elementType: 'geometry',
        stylers: [{
            color: '#222222'
        }]
    },
    {
        featureType: 'landscape',
        elementType: 'geometry',
        stylers: [{
            color: '#444444'
        }]
    },
    {
        featureType: 'road',
        elementType: 'geometry',
        stylers: [
            {
                color: '#444444'
            },
            {
                lightness: -37
            }
        ]
    },
    {
        featureType: 'poi',
        elementType: 'geometry',
        stylers: [{
            color: '#666666'
        }]
    },
    {
        elementType: 'labels.text.stroke',
        stylers: [
            {
                visibility: 'on'
            },
            {
                color: '#666666'
            },
            {
                weight: 2
            },
            {
                gamma: 0.84
            }
        ]
    },
    {
        elementType: 'labels.text.fill',
        stylers: [{
            color: '#ffffff'
        }]
    },
    {
        featureType: 'administrative',
        elementType: 'geometry',
        stylers: [
            {
                weight: 0.6
            },
            {
                color: '#444444'
            }
        ]
    },
    {
        featureType: 'administrative.country',
        elementType: 'geometry',
        stylers: [{
            color: '#d12727'
        }]
    },
    {
        featureType: 'administrative.province',
        elementType: 'geometry',
        stylers: [{
            color: '#d12727'
        }]
    },
    {
        elementType: 'labels.icon',
        stylers: [{
            visibility: 'off'
        }]
    },
    {
        featureType: 'poi.park',
        elementType: 'geometry',
        stylers: [{
            color: '#333333'
        }]
    },
    {
        featureType: 'poi.school',
        elementType: 'geometry',
        stylers: [{
            color: '#d12727'
        }]
    }
];
