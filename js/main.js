/**
 * 南水北调工程 - 动态流动线路图
 * 支持 LineString / MultiLineString 几何类型
 * 数据来源：外部 JS 文件（data/*.js）或内置演示数据
 */

// ========== DOM ==========
const routeNameEl = document.getElementById('route-name');
const routeDescEl = document.getElementById('route-desc');
const routeDetailsEl = document.getElementById('route-details');

// ========== 可调参数 ==========
let flowColor = '#1890ff';
let lineWidth = 4;
let animationSpeed = 2;
let waveLength = 80;
let darkAlpha = 0.08;
let brightAlpha = 0.95;
let highlightStrength = 0.70;

// ========== 状态 ==========
let animationFrame = 0;
const routeFeatures = {};
const routeLayers = {};
const visibleRoutes = { east: true, middle: false, west: false };
const routeColors = { east: '#1890ff', middle: '#52c41a', west: '#faad14' };

// ========== 工具函数：将 GeoJSON Feature 的坐标展平为单数组 ==========
function flattenCoords(geometry) {
  const type = geometry.type;
  const coords = geometry.coordinates;

  if (type === 'LineString') {
    return coords.map(function (c) { return [c[0], c[1]]; });
  }

  if (type === 'MultiLineString') {
    let result = [];
    coords.forEach(function (line) {
      line.forEach(function (c) {
        result.push([c[0], c[1]]);
      });
    });
    return result;
  }

  // Polygon, MultiPolygon 等不处理
  console.warn('不支持的几何类型:', type);
  return [];
}

// ========== 从 window 全局变量收集外部数据 ==========
function gatherExternalRoutes() {
  const routes = {};
  const sources = [
    { key: 'east',  var: '__dongxianData',  color: '#1890ff', name: '东线工程' },
    { key: 'middle', var: '__zhongxianData', color: '#52c41a', name: '中线工程' },
    { key: 'west',   var: '__xixianData',    color: '#faad14', name: '西线工程' }
  ];

  sources.forEach(function (s) {
    if (window[s.var]) {
      routes[s.key] = {
        data: window[s.var],
        color: s.color,
        name: s.name,
        isExternal: true
      };
    }
  });

  return routes;
}

// ========== 内置演示数据（无外部数据时使用） ==========
function getDemoRoutes() {
  return {
    east: {
      name: '东线工程',
      color: '#1890ff',
      segments: [
        [
          [117.78128372986032,34.522882816388915],[117.759011933054353,34.535676581708913],[117.742956781730186,34.547588408878028],[117.732391975309497,34.554940943969427],[117.722274506963004,34.555297863305782],[117.719542886395175,34.553513266624009],[117.698052372019447,34.552415852709487],[117.670161281917672,34.556486444194093],[117.663219346695541,34.558757021019744],[117.65460898022036,34.563585713110228],[117.646556412848213,34.565000628176506],[117.64067796461643,34.566033529224057],[117.630625167417634,34.573915657981274],[117.612374452618951,34.583021621950365],[117.605288608782303,34.582418571659787],[117.595639798737807,34.581513995774344],[117.586141751940318,34.581966283717065],[117.571367012177916,34.585433824911149],[117.570062633683619,34.585694701149578],[117.563699343849748,34.592235158325934],[117.555418819023316,34.592425515125456],[117.548756328341938,34.584144990299137],[117.538349992358349,34.581664758122145],[117.533977875278765,34.579554080756282],[117.517092459049763,34.579704844003402],[117.465983920621511,34.572920524862411],[117.446496657794569,34.577150064324087],[117.441416508964835,34.578280307989871],[117.429014758124595,34.576919256018925],[117.416641560759444,34.57839452188972],[117.394655341870589,34.577823452390476],[117.393438151749365,34.580816789163521],[117.387556124215848,34.587669636644478],[117.382359380980688,34.589154420040529],[117.370880860663306,34.594522484125378],[117.355290632756578,34.599776334310434],[117.333475733818091,34.614624170968739],[117.25258024897937,34.673694458732314],[117.240290332433005,34.682296210601692],[117.209071803820734,34.692765839072251],[117.168525789333785,34.706090821334385],[117.150441885284863,34.713514739213906],[117.140162612714448,34.743781482929137],[117.065875840897434,34.817116470748601],[117.029945979923127,34.839721351259413],[117.012581295190671,34.863474430400686],[117.010011477048124,34.870898349179527],[117.006013981560045,34.886317256236453],[116.911329848293917,34.954530344200066],[116.881348640227657,34.981180307825014],[116.824241576087957,35.014730708355557],[116.778555924416423,35.029007473715978],[116.723590375395588,35.054705653343262],[116.682187753961784,35.072551610268647],[116.658631090352628,35.091111405866741],[116.635074425844095,35.125375645069994],[116.627222204041573,35.15678452958241],[116.623653013375929,35.211036240829912],[116.615086952900583,35.244586641360456],[116.590697478406014,35.266998189215087],[116.571477630788081,35.287945632684853],[116.56699162626262,35.313897720603393],[116.565801488647821,35.324224382049636],[116.558057684614482,35.355494315010674],[116.55142006738231,35.373225525637565],[116.54657088783631,35.392106157073556],[116.543608332158897,35.398134552867361],[116.521669314187534,35.411788392020753],[116.489261055353495,35.43234693536283],[116.485834631163357,35.436344429052212],[116.461135825857696,35.469894828683437],[116.457943189426715,35.47335538484316],[116.453830881090312,35.4797576953614],[116.449607338308056,35.482018182693025],[116.433724435034719,35.484576103704285],[116.428608593911576,35.487907349044974],[116.414257024741914,35.501177407011767],[116.414484270832531,35.505972345747239],[116.410439186819076,35.509827072961116],[116.404062230887348,35.51139751678204],[116.390004274177954,35.524495815029866],[116.388705032611256,35.526418926192548],[116.37467810970702,35.539660625837257],[116.342880182974113,35.570676899619286],[116.316325398198614,35.596303694659809],[116.302476934962669,35.612721976038415],[116.292483198940545,35.623857853756988],[116.271567737161376,35.648699427336737],[116.253650395649288,35.669900423865499],[116.232520781908647,35.694670612858545],[116.227595297585026,35.700809622566055],[116.193702764371096,35.723826441137419],[116.191237262189929,35.733066363621845],[116.188620235035842,35.734334140608155],[116.183638721150146,35.751040044962167],[116.17640516007009,35.774834654795541],[116.179819686229621,35.784221628125692],[116.180117119009878,35.793293323428202],[116.183537594184713,35.801324003999639],[116.186660636579177,35.804000898122979],[116.187701651310249,35.810246982911963],[116.186214488307996,35.812626444255045],[116.188742665141945,35.835231323866537],[116.187701651310249,35.865272019388215],[116.179075469357485,35.902273479237749],[116.178798140022195,35.920091973565775]
        ],
        [
          [116.213353267639263,36.118734996922626],[116.213790557588254,36.119113616899938],[116.214204119824331,36.11946496943284],[116.217524505851316,36.126963944730335],[116.217547086029299,36.127686734355336],[116.216876828502905,36.130900332184638],[116.215864313287511,36.135611067396894],[116.215892834386864,36.136474863524199],[116.216530807151116,36.145591970992712],[116.217220078144123,36.147165791767918],[116.218016304608796,36.148739581066877],[116.219311659305731,36.152587555271509],[116.220500058530888,36.156205054819452],[116.221355705001884,36.160503616348876],[116.222199467831274,36.164629247242033],[116.222639176057214,36.166241061675692],[116.222710479704915,36.167977564413093],[116.222805551535089,36.168773847535078],[116.223768154376899,36.171248990448589],[116.223970182577887,36.17165191370492],[116.225396260928733,36.173004567806629],[116.226501471066058,36.173819986703052],[116.23012608694944,36.175738585067677],[116.236115615843005,36.179057649990625],[116.243543107628398,36.183594757592061],[116.251754942236857,36.188572802792692],[116.260430252354354,36.19382866206314],[116.263603276370191,36.196207109870272],[116.268749043333742,36.200637735043472],[116.274500892202468,36.20547085899301],[116.2807994047688,36.210763937605691],[116.286646326366963,36.21568272827534],[116.291566296947053,36.219882152139689],[116.297092350331809,36.224493588708185],[116.299968275215747,36.2269957310682],[116.301881597257989,36.229258134855115],[116.303402747438895,36.230791931302633],[116.304484190293238,36.23144378510267],[116.309332856326364,36.233293871315141],[116.316261220778756,36.235939514896756],[116.324817690883833,36.239217687646203],[116.328323466754682,36.240540419504782],[116.3319124308141,36.241048419548974],[116.332566049983257,36.241307211158926],[116.333065177316143,36.241805620832793],[116.334206040176696,36.244163441789453],[116.335382554861098,36.246684122774127],[116.336321389520549,36.24808340132796],[116.338412970682157,36.251016053648016],[116.340290640900434,36.25374734686261],[116.342227731124922,36.256507293376956],[116.345008583279537,36.260426633282577],[116.348585663697463,36.265533937141527],[116.352020135021235,36.270123518385731],[116.353541286101517,36.272049338306374],[116.354171137088315,36.272624200246696],[116.355442723602891,36.273496065990685],[116.356726193758846,36.274128402703695],[116.358152272109692,36.275009832737624],[116.359673422290712,36.275910414733914],[116.361087616999953,36.276446925984885],[116.361705584345259,36.276648116917102],[116.362727607193392,36.276897209338813],[116.36616207941654,36.277558259606053],[116.368015981452459,36.27789357273025],[116.369501479809514,36.277931894641256],[116.370143214437803,36.278094760065187],[116.371260309115996,36.278851602519467],[116.37372029485573,36.280566445984732],[116.374326377660282,36.281122085815639],[116.375526660527044,36.282453688586884],[116.378438237234946,36.285471265686397],[116.383667191487802,36.290912189246171],[116.389763675853033,36.297339269791507],[116.393364524453318,36.301116090535174],[116.394006259081607,36.301690738436889],[116.397215925974251,36.303879151401759],[116.3980121533383,36.304176042790175],[116.402017056542036,36.304990093817821],[116.408042237259451,36.306215944410383],[116.417585078388697,36.308179179725414],[116.427258643171854,36.310257281848124],[116.430312828074648,36.310908472847814],[116.435981489654068,36.311550082470376],[116.442327538585118,36.31231617625059],[116.446653309102999,36.312775829640884],[116.448923151182498,36.313120566760801],[116.451014732344106,36.314394168656008],[116.45516224374262,36.317362632879281],[116.455851514735627,36.317755227421856],[116.460343661630759,36.318588288318892],[116.463683062023733,36.31920110884414],[116.464431753023064,36.31920110884414],[116.469791430929831,36.319028752874715],[116.47758732549471,36.318731918143556],[116.478621232883597,36.318731918143556],[116.479904703039665,36.3189330002578],[116.483149031602579,36.319670295947446],[116.488484941326988,36.319919251672161],[116.490231886992092,36.319976702163103],[116.492394772700663,36.320426735505464],[116.493499983737365,36.320694838695886],[116.497599958771161,36.322944954146351],[116.500024291787668,36.324294992120258],[116.502424857521191,36.326229048931509],[116.505443389700758,36.328727932148411],[116.508717823968482,36.331453315018507],[116.509288255848446,36.332066034819718],[116.511113635885636,36.335129559181837],[116.511743486872433,36.335763310528421],[116.516853601112871,36.339381913544514],[116.520727780662583,36.342148404425359],[116.522866898188909,36.343593833488683],[116.527786868768999,36.345527410961324],[116.531497049749078,36.346944060819794],[116.532124523827747,36.347212073178696],[116.534501321378912,36.348628692460238],[116.539036250822392,36.351369969048903],[116.545583851313722,36.35538599506765],[116.54716679840908,36.355948758428497],[116.5534130216937,36.35706278731783],[116.564080088225523,36.35898071838551],[116.571253262528103,36.360232515318387],[116.57436211272136,36.360875633104058],[116.575873756169017,36.361679521792553],[116.576943314482492,36.362517854515431],[116.579752689535098,36.366054831465362],[116.583631622001803,36.370797342423486],[116.586298388859632,36.374150226351901],[116.586697690546089,36.374999907619667],[116.588808286972949,36.38168220676846],[116.590804796304383,36.388316099008819],[116.594203616703567,36.399470169113044],[116.59622389421736,36.406165669410143],[116.596461574242312,36.406777801054716],[116.596984469757558,36.407236895966037],[116.597911420775517,36.40781076145754],[116.600525897452258,36.409245405850868],[116.608868455714742,36.413989108410703],[116.616759423009057,36.41853169737999],[116.619136219660845,36.419822700257441],[116.620122590685128,36.42054947837579],[116.620693022564978,36.42119974667105],[116.62241620004761,36.423944204161728],[116.624365173913702,36.4271379791345],[116.626860811477286,36.431220848163662],[116.628286889828132,36.433582503829541],[116.628988044462744,36.434911500365502],[116.630152675505656,36.438209992397276],[116.632018461183065,36.44363068660698],[116.633812943212774,36.448821578852858],[116.635726265255016,36.454451822293834],[116.636867128115568,36.457663459601008],[116.637247415435922,36.458322975624867],[116.640658119476711,36.464134121292716],[116.643177524323391,36.468539979136779],[116.645494901868233,36.472429541590145],[116.650010816945723,36.480208080138823],[116.651603270774444,36.481870713462683],[116.65395630014325,36.483495090526048],[116.655453682141797,36.485138543109315],[116.656214257681881,36.486457102113604],[116.65657077681999,36.487450784626049],[116.657735407862788,36.491310735102388],[116.660920316419492,36.501609365579782],[116.661562051047895,36.503825590078975],[116.661728427425032,36.505808674330922],[116.662313118955353,36.514772039997695],[116.662622102628006,36.518955353406909],[116.663192534507971,36.521132879179106],[116.666211066687424,36.52667192147203],[116.669823798929201,36.532764411048788],[116.672961171121187,36.538245331057226],[116.674173337629441,36.540288641107963],[116.679045771844926,36.546418247504164],[116.684536174305094,36.55325380731739],[116.690692078676534,36.561005135978291],[116.698036382273244,36.570149175444158],[116.698820725096425,36.571008163795796],[116.70029433981199,36.571809877024236],[116.702504760986017,36.572344347713511],[116.716456561720975,36.575322047074849],[116.727793883980667,36.57774611479141],[116.731178443830231,36.578475228449065],[116.732262263592702,36.578898951225653],[116.733588516297004,36.579757841551213],[116.734501205865968,36.580673980919528],[116.736925539781851,36.584281174236878],[116.740340403187133,36.589210970809688],[116.74083953052002,36.590104097426206],[116.741139006559933,36.591054464092281],[116.741424222949604,36.591684218851697],[116.741994653930192,36.592233818835723],[116.748055486471571,36.595600033414883],[116.756112829243762,36.600088091092573],[116.763999042721707,36.60442706096012],[116.767450152402716,36.606373221746821],[116.768106148480001,36.606911269939189],[116.775236540234232,36.614729707809829],[116.78297170807798,36.623367892114572],[116.786432325391615,36.627182910662839],[116.787497130787983,36.628769902009424],[116.79133803452271,36.634232566679657],[116.79173733710843,36.634812380287144],[116.792022552598837,36.635071769046931],[116.792516926115354,36.635285382314578],[116.793486659681662,36.635407447295904],[116.798658570836437,36.635590543868545],[116.810029168911115,36.63601776770588],[116.811151016506301,36.636170346684196],[116.812520051759066,36.636643340617752],[116.816475042589218,36.639313413383377],[116.819536357317133,36.64147991796392],[116.820258904125239,36.642074933711285],[116.820924406935887,36.642944562841365],[116.821304695155618,36.643615849192145],[116.821818083038124,36.646102609547825],[116.822844859702627,36.652570859257821],[116.8231681039249,36.653470879177803],[116.823909665098995,36.654660720915615],[116.827272929278209,36.658703650079495],[116.828294288387582,36.660673414076157],[116.829836749083384,36.665279952100093],[116.830607979431278,36.667656175334166],[116.831056126795602,36.668344029428241],[116.831671026667564,36.668781754760829],[116.832348458729911,36.669115259776135],[116.833380239871019,36.669407076664534],[116.833846625790841,36.669508691473872]
        ]
      ],
      coords: [],
      startName: '台儿庄泵站',
      endName: '睦里闸',
      desc: '从扬州江都水利枢纽引水，利用京杭大运河及平行河道至天津，途经山东穿黄',
      length: '约1150公里',
      annual: '148亿立方米'
    },
    middle: {
      name: '中线工程',
      color: '#52c41a',
      coords: [
        [111.52,32.55],[111.64,32.78],[111.82,32.95],[112.02,33.10],
        [112.22,33.25],[112.38,33.38],[112.52,33.52],[112.65,33.68],
        [112.82,33.98],[112.95,34.20],[113.10,34.45],[113.28,34.72],
        [113.48,34.98],[113.72,35.25],[113.98,35.55],[114.25,35.85],
        [114.50,36.15],[114.72,36.48],[114.92,36.82],[115.10,37.18],
        [115.30,37.52],[115.52,37.88],[115.72,38.22],[115.90,38.55],
        [116.05,38.88],[116.15,39.18],[116.25,39.48],[116.32,39.75],
        [116.38,39.93]
      ],
      desc: '从丹江口水库引水，经河南、河北至北京和天津，全线自流',
      length: '约1432公里',
      annual: '130亿立方米'
    },
    west: {
      name: '西线工程（规划）',
      color: '#faad14',
      coords: [
        [100.20,28.80],[100.48,29.10],[100.78,29.42],[101.10,29.75],
        [101.42,30.08],[101.75,30.42],[102.05,30.75],[102.32,31.10],
        [102.55,31.45],[102.72,31.80],[102.82,32.15],[102.88,32.50],
        [102.95,32.85],[103.02,33.20],[103.08,33.55],[103.12,33.90],
        [103.18,34.22],[103.22,34.55]
      ],
      desc: '从长江上游通天河、雅砻江、大渡河引水至黄河上游',
      length: '约300公里（规划）',
      annual: '170亿立方米（规划）'
    }
  };
}

// ========== 构建最终线路列表 ==========
function buildRoutes() {
  const external = gatherExternalRoutes();
  const demo = getDemoRoutes();

  const result = {};

  ['east', 'middle', 'west'].forEach(function (key) {
    if (external[key]) {
      // 外部数据：从 GeoJSON FeatureCollection 提取坐标
      const fc = external[key].data;
      let allCoords = [];
      let segments = [];
      const descArr = [];

      if (fc && fc.features) {
        fc.features.forEach(function (f, idx) {
          const flat = flattenCoords(f.geometry);
          segments.push(flat);
          allCoords = allCoords.concat(flat);

          // 收集描述信息
          if (f.properties) {
            if (f.properties.desc_) descArr.push(f.properties.desc_);
            if (f.properties.desc) descArr.push(f.properties.desc);
          }
        });
      }

      result[key] = {
        name: external[key].name,
        color: external[key].color,
        coords: allCoords,
        segments: segments,
        desc: descArr.join('；') || '自定义线路数据',
        length: '约' + Math.round(allCoords.length * 0.8) + '公里（估算）',
        annual: '自定义数据',
        isExternal: true,
        startName: demo[key].startName || undefined,
        endName: demo[key].endName || undefined
      };
    } else {
      // 内置演示数据
      result[key] = demo[key];
    }
  });

  return result;
}

// ========== 流动样式：实线底 + 平滑渐变波 ==========
// 注意：pixelCoordinates 已是 CSS 像素坐标，不要用 pixelRatio 再乘
function createFlowStyle(isDashed) {
  return function () {
    return new ol.style.Style({
      renderer: function (pixelCoordinates, state) {
        const ctx = state.context;
        if (!pixelCoordinates || pixelCoordinates.length < 2) return;

        const color = flowColor;
        const lw = lineWidth;
        const spd = animationFrame * animationSpeed * 0.6;
        const wl = waveLength;

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // ===== 1. 底部暗线 =====
        ctx.strokeStyle = color;
        ctx.lineWidth = lw + 4;
        ctx.globalAlpha = 0.25;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(pixelCoordinates[0][0], pixelCoordinates[0][1]);
        for (let i = 1; i < pixelCoordinates.length; i++) {
          ctx.lineTo(pixelCoordinates[i][0], pixelCoordinates[i][1]);
        }
        ctx.stroke();

        if (isDashed) {
          // ===== 西线（虚线）=====
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = lw * 0.6;
          ctx.globalAlpha = 0.7;
          ctx.setLineDash([6, 12]);
          ctx.lineDashOffset = -animationFrame * animationSpeed * 0.5;
          ctx.beginPath();
          ctx.moveTo(pixelCoordinates[0][0], pixelCoordinates[0][1]);
          for (let i = 1; i < pixelCoordinates.length; i++) {
            ctx.lineTo(pixelCoordinates[i][0], pixelCoordinates[i][1]);
          }
          ctx.stroke();
        } else {
          // ===== 已建线路：渐变波 =====
          const minAlpha = darkAlpha;
          const maxAlpha = brightAlpha;
          let cumDist = 0;

          for (let i = 1; i < pixelCoordinates.length; i++) {
            const x1 = pixelCoordinates[i - 1][0];
            const y1 = pixelCoordinates[i - 1][1];
            const x2 = pixelCoordinates[i][0];
            const y2 = pixelCoordinates[i][1];

            const segDist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
            const midDist = cumDist + segDist / 2;
            const phase = ((midDist - spd + wl) % wl) / wl * Math.PI * 2;
            const t = (Math.sin(phase) + 1) / 2;
            const alpha = minAlpha + (maxAlpha - minAlpha) * t;

            ctx.strokeStyle = color;
            ctx.lineWidth = lw + 1;
            ctx.globalAlpha = alpha;
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();

            cumDist += segDist;
          }

          // 峰顶白色高亮
          const hlThresh = 1 - highlightStrength;
          if (highlightStrength > 0) {
            cumDist = 0;
            for (let i = 1; i < pixelCoordinates.length; i++) {
              const x1 = pixelCoordinates[i - 1][0];
              const y1 = pixelCoordinates[i - 1][1];
              const x2 = pixelCoordinates[i][0];
              const y2 = pixelCoordinates[i][1];

              const segDist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
              const midDist = cumDist + segDist / 2;
              const phase = ((midDist - spd + wl) % wl) / wl * Math.PI * 2;
              const t = (Math.sin(phase) + 1) / 2;
              if (t > hlThresh) {
                const whiteAlpha = (t - hlThresh) / highlightStrength;
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = lw * 0.35;
                ctx.globalAlpha = 0.1 + 0.6 * whiteAlpha;
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
              }

              cumDist += segDist;
            }
          }
        }

        ctx.restore();
      }
    });
  };
}

// ========== 地图初始化 ==========
const map = new ol.Map({
  target: 'map',
  view: new ol.View({
    center: ol.proj.fromLonLat([113, 34]),
    zoom: 5.2
  }),
  controls: ol.control.defaults.defaults({
    zoomOptions: { delta: 0.1 },
    rotate: false,
    attributionOptions: { collapsed: true }
  })
});

// ============================================================
// 底图：ESRI 卫星影像作为兜底（免费，无需 key）
// ============================================================
map.addLayer(new ol.layer.Tile({
  source: new ol.source.XYZ({
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attributions: '&copy; Esri, Maxar, Earthstar Geographics'
  }),
  className: 'basemap-esri'  // 给底层标识，方便天地图加载后隐藏
}));

// ============================================================
// 天地图卫星影像 + 中文标注（叠加在 ESRI 之上）
// 注册 key：console.tianditu.gov.cn → 创建应用 → 应用类型选"浏览器端"
//            → 域名白名单填 localhost → 勾选"地图API"
// 拿到 key 后替换下方占位符
// ============================================================
const tiandituKey = '86716776d1796dc18990093ed31872bf';

if (tiandituKey && tiandituKey.length > 20) {
  addTiandituLayer(tiandituKey);
} else {
  console.warn('⚠️ 请去 console.tianditu.gov.cn 注册获取自己的 key，然后替换上方 tiandituKey 的值');
}

function addTiandituLayer(key) {
  // 天地图 WMTS 官方 API（tianditu.gov.cn）
  // 卫星图 img_w + 中文标注 cia_w（球面墨卡托 EPSG:3857）
  // 注意：key 必须为「浏览器端」且在 console.tianditu.gov.cn 勾选服务类型
  const satLayer = new ol.layer.Tile({
    source: new ol.source.XYZ({
      url: 'http://t0.tianditu.gov.cn/img_w/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile&LAYER=img&STYLE=default&FORMAT=tiles&TILEMATRIXSET=w&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=' + key,
      wrapX: false,
      attributions: '&copy; 天地图'
    })
  });
  const labelLayer = new ol.layer.Tile({
    source: new ol.source.XYZ({
      url: 'http://t0.tianditu.gov.cn/cia_w/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile&LAYER=cia&FORMAT=tiles&TILEMATRIXSET=w&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=' + key,
      wrapX: false
    })
  });
  window.tiandituLabelLayer = labelLayer;
  // 仅在大面积失败时才回退（边缘或高缩放级个别瓦片不存在是正常的）
  var totalLoaded = 0;
  var totalFailed = 0;
  satLayer.getSource().on('tileloadend', function () {
    totalLoaded++;
  });
  satLayer.getSource().on('tileloaderror', function () {
    totalFailed++;
    // 加载超过 20 张瓦片后，失败率超过 80% 才判定服务不可用
    if (totalLoaded + totalFailed > 20 && totalFailed / (totalLoaded + totalFailed) > 0.8) {
      console.error('❌ 天地图大面积加载失败（失败率 ' + (totalFailed / (totalLoaded + totalFailed) * 100).toFixed(0) + '%），回退 ESRI');
      map.removeLayer(satLayer);
      map.removeLayer(labelLayer);
    }
  });

  map.addLayer(satLayer);
  map.addLayer(labelLayer);
  console.log('✅ 天地图卫星影像已启用');
}

// ========== 构建路线图层 ==========
function initRoutes() {
  const routes = buildRoutes();

  Object.keys(routes).forEach(function (routeId) {
    const r = routes[routeId];

    // 西线虚线
    const isDashed = routeId === 'west';

    // 外部数据可能有多个段
    const segments = r.segments || [r.coords];
    const routeFeaturesArr = [];

    segments.forEach(function (segCoords, segIdx) {
      if (segCoords.length < 2) return;

      const projCoords = segCoords.map(function (c) {
        return ol.proj.fromLonLat(c);
      });
      const geom = new ol.geom.LineString(projCoords);

      const olFeature = new ol.Feature({
        geometry: geom,
        name: segments.length > 1 ? r.name + '（段' + (segIdx + 1) + '）' : r.name,
        description: r.desc,
        length: r.length,
        annual_diversion: r.annual,
        color: r.color,
        routeId: routeId
      });
      if (segIdx === 0) olFeature.setId(routeId);
      routeFeaturesArr.push(olFeature);
    });

    const layer = new ol.layer.Vector({
      source: new ol.source.Vector({ features: routeFeaturesArr }),
      style: createFlowStyle(isDashed),
      properties: { routeId: routeId },
      declutter: false,
      visible: !!visibleRoutes[routeId]
    });

    map.addLayer(layer);
    routeLayers[routeId] = layer;
    routeFeatures[routeId] = routeFeaturesArr[0];
  });

  addEndpointMarkers(routes);
  addLakes();
}

// ========== 加载湖泊多边形 ==========
function addLakes() {
  const lakeSources = [
    { var: '__dongpinghuData', name: '东平湖', fillColor: 'rgba(30, 140, 240, 0.25)', strokeColor: 'rgba(30, 140, 240, 0.6)' }
  ];

  lakeSources.forEach(function (source) {
    const fc = window[source.var];
    if (!fc || !fc.features) return;

    const olFeatures = [];
    fc.features.forEach(function (feature) {
      const geom = feature.geometry;
      if (geom.type !== 'MultiPolygon' && geom.type !== 'Polygon') return;

      let polygons;
      if (geom.type === 'Polygon') {
        polygons = [geom.coordinates];
      } else {
        polygons = geom.coordinates;
      }

      polygons.forEach(function (polygon) {
        const projectedRings = polygon.map(function (ring) {
          return ring.map(function (coord) {
            return ol.proj.fromLonLat(coord);
          });
        });

        const olGeom = new ol.geom.Polygon(projectedRings);
        olFeatures.push(new ol.Feature({
          geometry: olGeom,
          name: source.name
        }));
      });
    });

    if (olFeatures.length > 0) {
      // 湖面填充
      map.addLayer(new ol.layer.Vector({
        source: new ol.source.Vector({ features: olFeatures }),
        style: new ol.style.Style({
          fill: new ol.style.Fill({ color: source.fillColor }),
          stroke: new ol.style.Stroke({ color: source.strokeColor, width: 2 })
        })
      }));

      // 标注：计算多边形 interiorPoint 作为标签锚点
      const labelFeatures = [];
      olFeatures.forEach(function (f) {
        const interior = f.getGeometry().getInteriorPoint();
        labelFeatures.push(new ol.Feature({
          geometry: interior,
          name: source.name
        }));
      });

      map.addLayer(new ol.layer.Vector({
        source: new ol.source.Vector({ features: labelFeatures }),
        declutter: false,
        style: new ol.style.Style({
          text: new ol.style.Text({
            text: source.name,
            font: 'bold 10px "Microsoft YaHei","PingFang SC",sans-serif',
            fill: new ol.style.Fill({ color: '#fff' }),
            stroke: new ol.style.Stroke({ color: 'rgba(0,0,0,0.7)', width: 3 }),
            overflow: true
          })
        })
      }));

      console.log('已加载湖泊：' + source.name);
    }
  });
}

// ========== 路线端点标记 ==========
function addEndpointMarkers(routes) {
  const markerFeatures = [];

  Object.keys(routes).forEach(function (routeId) {
    const r = routes[routeId];
    // 优先用 coords，为空则从 segments 取首段首点和末段末点
    let coords = r.coords && r.coords.length >= 2 ? r.coords : null;
    if (!coords && r.segments && r.segments.length > 0) {
      const firstSeg = r.segments[0];
      const lastSeg = r.segments[r.segments.length - 1];
      coords = [firstSeg[0], lastSeg[lastSeg.length - 1]];
    }
    if (!coords || coords.length < 2) return;
    const color = r.color;

    // 起点
    const start = coords[0];
    markerFeatures.push(new ol.Feature({
      geometry: new ol.geom.Point(ol.proj.fromLonLat(start)),
      routeId: routeId,
      color: color,
      isStart: true
    }));

    // 终点
    const end = coords[coords.length - 1];
    markerFeatures.push(new ol.Feature({
      geometry: new ol.geom.Point(ol.proj.fromLonLat(end)),
      routeId: routeId,
      color: color,
      isStart: false
    }));
  });

  map.addLayer(new ol.layer.Vector({
    source: new ol.source.Vector({ features: markerFeatures }),
    style: function (feature) {
      const c = feature.get('color');
      const rid = feature.get('routeId');
      const route = routes[rid];
      return new ol.style.Style({
        image: new ol.style.Circle({
          radius: 6,
          fill: new ol.style.Fill({ color: '#fff' }),
          stroke: new ol.style.Stroke({ color: c, width: 3 })
        }),
        text: route ? new ol.style.Text({
          text: feature.get('isStart') ? (route.startName || route.name) : (route.endName || route.name),
          font: 'bold 10px "Microsoft YaHei","PingFang SC",sans-serif',
          fill: new ol.style.Fill({ color: '#fff' }),
          stroke: new ol.style.Stroke({ color: 'rgba(0,0,0,0.75)', width: 2 }),
          offsetY: -14
        }) : undefined
      });
    }
  }));
}

// ========== 动画循环 ==========
function animate() {
  animationFrame++;
  map.render();
  requestAnimationFrame(animate);
}

// ========== 鼠标交互 ==========
const coordBar = document.getElementById('coord-bar');

map.on('pointermove', function (evt) {
  let hitRouteId = null;
  const features = map.getFeaturesAtPixel(evt.pixel, {
    layerFilter: function (layer) { return !!layer.get('routeId'); },
    hitTolerance: 8
  });
  if (features && features.length > 0) {
    hitRouteId = features[0].get('routeId');
    if (hitRouteId && routeFeatures[hitRouteId]) {
      showRouteInfo(routeFeatures[hitRouteId].getProperties());
    }
  }
  map.getTargetElement().style.cursor = hitRouteId ? 'pointer' : '';
  // 实时坐标
  const lonLat = ol.proj.toLonLat(evt.coordinate);
  coordBar.innerHTML = '经度 <span>' + lonLat[0].toFixed(6) + '</span> | 纬度 <span>' + lonLat[1].toFixed(6) + '</span>';
});

map.on('click', function (evt) {
  const features = map.getFeaturesAtPixel(evt.pixel, {
    layerFilter: function (layer) { return !!layer.get('routeId'); },
    hitTolerance: 8
  });
  if (features && features.length > 0) {
    const routeId = features[0].get('routeId');
    if (routeId && routeFeatures[routeId]) {
      showRouteInfo(routeFeatures[routeId].getProperties(), true);
    }
  }
});

// ========== 信息展示 ==========
function showRouteInfo(props, isClick) {
  if (routeNameEl) routeNameEl.textContent = props.name || '点击线路查看详情';
  if (routeDescEl) routeDescEl.textContent = props.description || '';
  if (routeDetailsEl && (props.length || props.annual_diversion)) {
    routeDetailsEl.innerHTML =
      '<div class="route-stat"><span>线路长度</span><span>' + (props.length || '-') + '</span></div>' +
      '<div class="route-stat"><span>年调水量</span><span>' + (props.annual_diversion || '-') + '</span></div>';
  }
  if (isClick && routeDetailsEl) {
    routeDetailsEl.style.transition = 'none';
    routeDetailsEl.style.transform = 'scale(1.02)';
    setTimeout(function () {
      routeDetailsEl.style.transition = 'transform 0.3s ease';
      routeDetailsEl.style.transform = 'scale(1)';
    }, 60);
  }
}

// ========== 面板开关 ==========
const panel = document.getElementById('panel');
document.getElementById('panel-close').addEventListener('click', function () {
  panel.classList.add('hidden');
});
// 面板隐藏后，点击关闭按钮文字仍可操作 → 地图空白处双击还原面板
map.on('dblclick', function () {
  if (panel.classList.contains('hidden')) {
    panel.classList.remove('hidden');
  }
});

// ========== 参数控制 ==========
document.getElementById('color-picker').addEventListener('input', function () {
  flowColor = this.value;
  document.getElementById('color-hex').textContent = flowColor;
});

document.getElementById('linewidth-slider').addEventListener('input', function () {
  lineWidth = parseFloat(this.value);
  document.getElementById('linewidth-value').textContent = lineWidth;
});

document.getElementById('speed-slider').addEventListener('input', function () {
  animationSpeed = parseFloat(this.value);
  document.getElementById('speed-value').textContent = animationSpeed + 'x';
});

document.getElementById('wavelength-slider').addEventListener('input', function () {
  waveLength = parseInt(this.value);
  document.getElementById('wavelength-value').textContent = waveLength;
});

document.getElementById('darkalpha-slider').addEventListener('input', function () {
  darkAlpha = parseInt(this.value) / 100;
  document.getElementById('darkalpha-value').textContent = darkAlpha.toFixed(2);
});

document.getElementById('brightalpha-slider').addEventListener('input', function () {
  brightAlpha = parseInt(this.value) / 100;
  document.getElementById('brightalpha-value').textContent = brightAlpha.toFixed(2);
});

document.getElementById('highlight-slider').addEventListener('input', function () {
  highlightStrength = parseInt(this.value) / 100;
  document.getElementById('highlight-value').textContent = highlightStrength.toFixed(2);
});

// ========== 天地图标注图层切换 ==========
document.getElementById('btn-toggle-labels').addEventListener('click', function () {
  if (!window.tiandituLabelLayer) return;
  const visible = !window.tiandituLabelLayer.getVisible();
  window.tiandituLabelLayer.setVisible(visible);
  this.textContent = visible ? '🗺 天地图标注：开' : '🗺 天地图标注：关';
  this.classList.toggle('off', !visible);
});

// ========== 全屏切换 ==========
document.getElementById('btn-fullscreen').addEventListener('click', function () {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    document.documentElement.requestFullscreen();
  }
});

// ========== 启动 ==========
initRoutes();
animate();
console.log('南水北调东线工程动态流动线路图已就绪');
