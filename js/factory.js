let settings = {
    factory: 4,
    collection: 724,
    accessory: 30,
    multiplier: 0.929,
    time_tower: 15,
    coach_jackrabbit: 15,
    rabbit_shrine: 3,
    current_choco: 0,
    rabbits: [180, 180, 180, 177, 173],
    targets: [180, 180, 180, 180, 180]
};
let config = {
    "factory": {
        "multiplier": [0, 0.1, 0.25, 0.5, 1],
        "next_lev": [150000000, 1000000000, 4000000000, 10000000000, 0],
        "worker_limit": [120, 140, 160, 180, 200]
    },
    "rabbits": [
        {
            "name": "Rabbit Bro",
            "factory_4": [110, 220, 440, 660, 880, 990, 1045, 1100, 1155, 1210, 1355, 1423, 1494, 1569, 1646, 1729, 1815, 1905, 2002, 2101, 2207, 2317, 2433, 2554, 2682, 2816, 2957, 3104, 3260, 3423, 3595, 3773, 3962, 4160, 4369, 4587, 4816, 5058, 5311, 5575, 5854, 6147, 6455, 6778, 7117, 7471, 7845, 8237, 8650, 9082, 9537, 10012, 10514, 11040, 11592, 12170, 12780, 13418, 14089, 14795, 15534, 16311, 17125, 17983, 18880, 19824, 20816, 21857, 22950, 24099, 25302, 26567, 27896, 29291, 30756, 32294, 33909, 35603, 37382, 39252, 41215, 43276, 45439, 47711, 50098, 52602, 55233, 57994, 60894, 63939, 67135, 70492, 74017, 77717, 81602, 85683, 89967, 94466, 99189, 104148, 109355, 114825, 120564, 126595, 132924, 139570, 146549, 153875, 161570, 169649, 178130, 187037, 196387, 206208, 216517, 227344, 238711, 250646, 263179, 276338, 290156, 304663, 319895, 335892, 352686, 370319, 388837, 408278, 428692, 450127, 472633, 496263, 521077, 547131, 574488, 603211, 633373, 665040, 698293, 733207, 769868, 808361, 848780, 891218, 935779, 982568, 1031697, 1083282, 1137446, 1194318, 1254033, 1316735, 1382572, 1451701, 1524285, 1600500, 1680525, 1764552, 1852778, 1945418, 2042689, 2144824, 2252065, 2364668, 2482902, 2607046, 2737398, 2874269, 3017982, 3168882, 3327326, 3493692, 3668377, 3851795, 4044385, 4246605, 4458936, 4681882, 4915975, 5161774, 0]
        },
        {
            "name": "Rabbit Cousin",
            "factory_4": [3168, 3494, 3667, 3850, 4044, 4246, 4457, 4682, 4915, 5161, 5419, 5689, 5973, 6272, 6587, 6915, 7262, 7625, 8006, 8406, 8826, 9266, 9731, 10217, 10727, 11264, 11827, 12419, 13039, 13693, 14377, 15096, 15851, 16643, 17475, 18348, 19265, 20229, 21241, 22304, 23417, 24589, 25819, 27108, 28464, 29887, 31383, 32952, 34599, 36329, 38146, 40053, 42055, 44158, 46365, 48684, 51119, 53673, 56357, 59176, 62135, 65241, 68504, 71929, 75524, 79301, 83266, 87430, 91802, 96391, 101211, 106271, 111584, 117163, 123022, 129173, 135632, 142413, 149534, 157010, 164861, 173105, 181760, 190848, 200389, 210410, 220931, 231977, 243575, 255754, 268541, 281970, 296067, 310871, 326414, 342734, 359872, 377865, 396759, 416596, 437426, 459296, 482262, 506374, 531694, 558279, 586192, 615503, 646276, 678590, 712521, 748147, 785554, 824831, 866074, 909377, 954846, 1002588, 1052718, 1105353, 1160621, 1218653, 1279584, 1343564, 1410741, 1481280, 1555343, 1633111, 1714766, 1800504, 1890528, 1985056, 2084309, 2188523, 2297951, 2412848, 2533489, 2660165, 2793173, 2932831, 3079472, 3233446, 3395119, 3564873, 3743117, 3930274, 4126789, 4333127, 4549783, 4777274, 5016136, 5266943, 5530290, 5806805, 6097146, 6402002, 6722102, 7058207, 7411118, 7781673, 8170758, 8579296, 9008261, 9458673, 9931607, 10428187, 10949596, 11497077, 12071930, 12675527, 13309303, 13974767, 14673507, 15407183, 16177542, 16986418, 17835739, 18727526, 19663901, 20647097, 0]
        },
        {
            "name": "Rabbit Sis",
            "factory_4": [7128, 7858, 8252, 8664, 9097, 9552, 10030, 10531, 11057, 11612, 12190, 12802, 13442, 14113, 14819, 15561, 16337, 17153, 18011, 18913, 19859, 20852, 21894, 22988, 24138, 25344, 26611, 27942, 29339, 30807, 32347, 33964, 35662, 37446, 39318, 41283, 43349, 45516, 47791, 50182, 52690, 55326, 58091, 60995, 64044, 67247, 70609, 74140, 77847, 81739, 85826, 90119, 94624, 99354, 104322, 109538, 115016, 120767, 126806, 133146, 139803, 146793, 154132, 161839, 169930, 178427, 187350, 196715, 206551, 216880, 227724, 239109, 251066, 263619, 276800, 290640, 305171, 320430, 336450, 353274, 370938, 389484, 408958, 429407, 450877, 473420, 497092, 521946, 548044, 575445, 604219, 634429, 666151, 699459, 734430, 771153, 809710, 850197, 892705, 937341, 984207, 1033419, 1085088, 1139345, 1196312, 1256127, 1318933, 1384880, 1454123, 1526829, 1603171, 1683330, 1767495, 1855872, 1948665, 2046097, 2148403, 2255823, 2368615, 2487045, 2611398, 2741968, 2879065, 3023018, 3174169, 3332877, 3499522, 3674497, 3858224, 4051133, 4253691, 4466374, 4689694, 4924179, 5170387, 5428907, 5700352, 5985368, 6284639, 6598869, 6928814, 7275255, 7639016, 8020967, 8422016, 8843116, 9285272, 9749535, 10237014, 10748863, 11286306, 11850621, 12443154, 13065312, 13718577, 14404504, 15124732, 15880966, 16675014, 17508766, 18384205, 19303414, 20268585, 21282015, 22346115, 23463420, 24636592, 25868423, 27161842, 28519935, 29945931, 31443229, 33015389, 34666159, 36399466, 38219441, 40130413, 42136934, 44243780, 46455970, 0]
        },
        {
            "name": "Rabbit Daddy",
            "factory_4": [12672, 13970, 14670, 15402, 16172, 16982, 17831, 18722, 19659, 20640, 21674, 22757, 23894, 25089, 26345, 27661, 29044, 30496, 32021, 33623, 35303, 37070, 38922, 40869, 42911, 45058, 47311, 49676, 52160, 54767, 57506, 60381, 63400, 66570, 69898, 73394, 77064, 80916, 84962, 89210, 93672, 98355, 103272, 108436, 113859, 119550, 125528, 131804, 138395, 145314, 152581, 160211, 168221, 176631, 185462, 194735, 204472, 214696, 225432, 236702, 248538, 260964, 274012, 287714, 302100, 317205, 333065, 349719, 367204, 385563, 404842, 425084, 446338, 468655, 492087, 516692, 542527, 569653, 598136, 628043, 659446, 692417, 727038, 763389, 801559, 841636, 883718, 927905, 974301, 1023015, 1074165, 1127874, 1184269, 1243482, 1305656, 1370939, 1439484, 1511459, 1587032, 1666383, 1749704, 1837189, 1929048, 2025500, 2126775, 2233114, 2344769, 2462009, 2585108, 2714364, 2850082, 2992585, 3142216, 3299327, 3464292, 3637506, 3819383, 4010351, 4210868, 4421413, 4642484, 4874608, 5118337, 5374255, 5642967, 5925115, 6221371, 6532440, 6859063, 7202015, 7562117, 7940222, 8337232, 8754095, 9191800, 9651389, 10133959, 10640656, 11172689, 11731324, 12317890, 12933785, 13580475, 14259498, 14972472, 15721097, 16507152, 17332509, 18199135, 19109090, 20064546, 21067772, 22121161, 23227219, 24388580, 25608009, 26888409, 28232831, 29644472, 31126696, 32683031, 34317182, 36033041, 37834694, 39726427, 41712748, 43798385, 45988305, 48287721, 50702106, 53237213, 55899072, 58694027, 61628728, 64710164, 67945673, 71342955, 74910103, 78655610, 82588389, 0]
        },
        {
            "name": "Rabbit Granny",
            "factory_4": [19800, 21831, 22922, 24068, 25271, 26534, 27861, 29253, 30716, 32252, 33865, 35559, 37336, 39202, 41162, 43221, 45382, 47652, 50035, 52536, 55163, 57919, 60817, 63857, 67049, 70402, 73922, 77618, 81499, 85573, 89852, 94345, 99064, 104016, 109217, 114677, 120413, 126432, 132755, 139392, 146362, 153679, 161363, 169431, 177903, 186798, 196139, 205944, 216242, 227055, 238407, 250327, 262845, 275986, 289786, 304275, 319488, 335463, 352235, 369849, 388340, 407757, 428144, 449552, 472030, 495631, 520412, 546434, 573756, 602444, 632566, 664193, 697404, 732274, 768887, 807332, 847697, 890083, 934586, 981317, 1030383, 1081901, 1135996, 1192796, 1252436, 1315059, 1380810, 1449851, 1522345, 1598461, 1678384, 1762303, 1850418, 1942939, 2040086, 2142092, 2249196, 2361656, 2479739, 2603724, 2733911, 2870606, 3014136, 3164843, 3323087, 3489240, 3663702, 3846887, 4039233, 4241193, 4453253, 4675915, 4909711, 5155196, 5412957, 5683605, 5967786, 6266174, 6579483, 6908458, 7253880, 7616574, 7997403, 8397272, 8817136, 9257994, 9720894, 10206937, 10717285, 11253150, 11815806, 12406596, 13026926, 13678273, 14362187, 15080296, 15834311, 16626027, 17457328, 18330193, 19246704, 20209039, 21219491, 22280465, 23394488, 24564212, 25792424, 27082044, 28436146, 29857953, 31350851, 32918395, 34564314, 36292531, 38107157, 40012515, 42013140, 44113797, 46319486, 48635462, 51067234, 53620596, 56301626, 59116708, 62072542, 65176170, 68434978, 71856728, 75449563, 79222042, 83183144, 87342301, 91709416, 96294887, 101109631, 106165114, 111473369, 117047038, 122899390, 129044359, 0]
        }
    ],
    "time_tower": [
        {
            "multipliers": [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.3, 1.4, 1.5],
            "factory_levels": [false, true, true, true, true],
            "cost": {
                "factory_2": [5500000, 11000000, 16500000, 22000000, 33000000, 44000000, 55000000, 66000000, 77000000, 88000000, 110000000, 132000000, 165000000, 220000000, 0],
                "factory_4": [6500000, 13000000, 19500000, 26000000, 39000000, 52000000, 65000000, 78000000, 91000000, 104000000, 130000000, 156000000, 195000000, 260000000, 0]
            }
        }
    ]
};

function formatNumber(num, maximumFractionDigits=2) {
    const lang = navigator.language.slice(0, 2);
    return new Intl.NumberFormat(lang, {maximumFractionDigits, minimumFractionDigits: maximumFractionDigits}).format(num);
}

function rabbitChange(number) {
    const combo = document.getElementById('cbRabbit' + number);
    const CPS = document.getElementById('lbCPS' + number);
    const upCost = document.getElementById('lbUpCost' + number);
    CPS.innerHTML = (Number(combo.value) * (1 + number)).toString();
    const curRabbit = config["rabbits"][number];
    upCost.innerHTML = formatNumber(curRabbit["factory_" + settings.factory][combo.value], 0);
}

function formRabbitsTable(cfg) {
    if (cfg !== undefined) config = cfg;

    let maxRabbitLev = config["factory"].worker_limit[settings.factory-1];
    let tblBody = "";
    for (let rabbit = 0; rabbit < config["rabbits"].length; rabbit++) {
        const curRabbit = config["rabbits"][rabbit];
        const CPS = settings.rabbits[rabbit] * (1 + rabbit);
        const rabbitLev = settings.rabbits[rabbit];
        let upCost = curRabbit["factory_" + settings.factory][rabbitLev];
        let perChoc = 0.0;
        let diff = 0;
        let options = "";
        for (let level= 0; level <= maxRabbitLev; level++) {
            const sel = level === rabbitLev ? " selected": "";
            options += `<option${sel}>${level}</option>`
        }
        tblBody += `<tr><th scope="row" class="text-start">${curRabbit.name}</th>`;
        tblBody += `<td><select id="cbRabbit${rabbit}" class="form-select lev-select bg-info-subtle" aria-label="Level" onchange="rabbitChange(${rabbit})">${options}</select></td>`;
        tblBody += `<td id="lbCPS${rabbit}">${CPS}</td><td id="lbUpCost${rabbit}">${formatNumber(upCost,0)}</td><td>${perChoc}</td>`;
        tblBody += `<td>${maxRabbitLev}</td><td>${diff}</td></tr>`;
    }
    document.getElementById('tbRabbits').innerHTML = tblBody;
}

function init() {
    fetch("../json/factory.json").then(res => res.json().then(cfg => formRabbitsTable(cfg)));
}


