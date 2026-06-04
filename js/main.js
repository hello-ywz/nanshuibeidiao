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
      coords: [
        [119.42,32.39],[119.45,32.52],[119.52,32.75],[119.55,32.88],
        [119.58,33.01],[119.53,33.25],[119.42,33.48],[119.35,33.68],
        [119.22,33.92],[119.12,34.10],[118.85,34.37],[118.58,34.65],
        [118.28,34.90],[117.95,35.12],[117.62,35.40],[117.35,35.70],
        [117.18,36.00],[117.12,36.32],[117.10,36.65],[117.08,37.00],
        [117.05,37.32],[117.03,37.62],[117.07,37.92],[117.12,38.18],
        [117.18,38.45],[117.21,38.70],[117.22,38.95]
      ],
      desc: '从扬州江都水利枢纽引水，利用京杭大运河及平行河道至天津',
      length: '约1467公里',
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
        isExternal: true
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
    zoom: 5.2,
    minZoom: 4,
    maxZoom: 12
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
    const coords = r.coords;
    if (coords.length < 2) return;
    const color = r.color;

    // 起点
    const start = coords[0];
    markerFeatures.push(new ol.Feature({
      geometry: new ol.geom.Point(ol.proj.fromLonLat(start)),
      routeId: routeId,
      color: color
    }));

    // 终点
    const end = coords[coords.length - 1];
    markerFeatures.push(new ol.Feature({
      geometry: new ol.geom.Point(ol.proj.fromLonLat(end)),
      routeId: routeId,
      color: color
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
          text: route.name,
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
  routeNameEl.textContent = props.name || '点击线路查看详情';
  routeDescEl.textContent = props.description || '';
  if (props.length || props.annual_diversion) {
    routeDetailsEl.innerHTML =
      '<div class="route-stat"><span>线路长度</span><span>' + (props.length || '-') + '</span></div>' +
      '<div class="route-stat"><span>年调水量</span><span>' + (props.annual_diversion || '-') + '</span></div>';
  }
  if (isClick) {
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

routeNameEl.textContent = '东线工程';
routeDescEl.textContent = '从扬州江都水利枢纽引水，利用京杭大运河及平行河道至天津。';
routeDetailsEl.innerHTML =
  '<div class="route-stat"><span>线路长度</span><span>约1467公里</span></div>' +
  '<div class="route-stat"><span>年调水量</span><span>148亿m³/年</span></div>';

animate();
console.log('南水北调东线工程动态流动线路图已就绪');
