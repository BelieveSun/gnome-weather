import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Soup from 'gi://Soup?version=3.0';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

// ========== 常量 ==========

const API_SENIVERSE = 'https://api.seniverse.com/v3';
const MONTHLY_CALL_LIMIT = 9500;

// 心知天气代码 -> GNOME 系统图标
const SV_ICON = {
    0: 'weather-clear-symbolic', 1: 'weather-clear-night-symbolic',
    2: 'weather-few-clouds-symbolic', 3: 'weather-few-clouds-night-symbolic',
    4: 'weather-overcast-symbolic', 5: 'weather-few-clouds-symbolic',
    6: 'weather-few-clouds-night-symbolic', 7: 'weather-overcast-symbolic',
    8: 'weather-overcast-symbolic', 9: 'weather-overcast-symbolic',
    10: 'weather-showers-scattered-symbolic', 11: 'weather-storm-symbolic',
    12: 'weather-storm-symbolic', 13: 'weather-showers-symbolic',
    14: 'weather-showers-symbolic', 15: 'weather-showers-symbolic',
    16: 'weather-storm-symbolic', 17: 'weather-storm-symbolic',
    18: 'weather-storm-symbolic', 19: 'weather-showers-symbolic',
    20: 'weather-snow-symbolic', 21: 'weather-snow-symbolic',
    22: 'weather-snow-symbolic', 23: 'weather-snow-symbolic',
    24: 'weather-snow-symbolic', 25: 'weather-snow-symbolic',
    26: 'weather-fog-symbolic', 27: 'weather-fog-symbolic',
    28: 'weather-severe-alert-symbolic', 29: 'weather-severe-alert-symbolic',
    30: 'weather-fog-symbolic', 31: 'weather-fog-symbolic',
    32: 'weather-severe-alert-symbolic', 33: 'weather-severe-alert-symbolic',
    34: 'weather-severe-alert-symbolic', 35: 'weather-severe-alert-symbolic',
    36: 'weather-severe-alert-symbolic', 37: 'weather-snow-symbolic',
    38: 'weather-clear-symbolic',
};

// 心知 -> 和风图标代码近似映射 (用于查找SVG文件)
const SV_TO_QW = {
    0: '100', 1: '150', 2: '101', 3: '151', 4: '104',
    5: '102', 6: '152', 7: '104', 8: '104', 9: '104',
    10: '300', 11: '302', 12: '304', 13: '305', 14: '306',
    15: '307', 16: '310', 17: '311', 18: '312', 19: '313',
    20: '404', 21: '407', 22: '400', 23: '401', 24: '402',
    25: '403', 26: '503', 27: '504', 28: '507', 29: '508',
    30: '501', 31: '502', 32: '507', 33: '508', 34: '507',
    35: '507', 36: '507', 37: '400', 38: '900',
};

// 心知天气生活指数
const SV_LIFE = {
    car_washing: {name: '洗车', icon: 'weather-showers-symbolic'},
    dressing: {name: '穿衣', icon: 'preferences-desktop-wallpaper-symbolic'},
    flu: {name: '感冒', icon: 'dialog-warning-symbolic'},
    sport: {name: '运动', icon: 'emblem-favorite-symbolic'},
    travel: {name: '旅游', icon: 'find-location-symbolic'},
    uv: {name: '紫外线', icon: 'weather-clear-symbolic'},
    ac: {name: '空调', icon: 'weather-snow-symbolic'},
    air_pollution: {name: '空气污染', icon: 'weather-fog-symbolic'},
    airing: {name: '晾晒', icon: 'weather-few-clouds-symbolic'},
    allergy: {name: '过敏', icon: 'dialog-information-symbolic'},
    comfort: {name: '舒适度', icon: 'face-smile-symbolic'},
    umbrella: {name: '雨伞', icon: 'weather-showers-scattered-symbolic'},
    beer: {name: '啤酒', icon: 'emblem-shared-symbolic'},
    fishing: {name: '钓鱼', icon: 'find-location-symbolic'},
    makeup: {name: '化妆', icon: 'view-reveal-symbolic'},
    morning_sport: {name: '晨练', icon: 'weather-clear-symbolic'},
    sunscreen: {name: '防晒', icon: 'weather-clear-symbolic'},
};

// 和风天气生活指数
const QW_LIFE = {
    '1': {name: '运动', icon: 'emblem-favorite-symbolic'},
    '2': {name: '洗车', icon: 'weather-showers-symbolic'},
    '3': {name: '穿衣', icon: 'preferences-desktop-wallpaper-symbolic'},
    '5': {name: '紫外线', icon: 'weather-clear-symbolic'},
    '6': {name: '旅游', icon: 'find-location-symbolic'},
    '8': {name: '舒适度', icon: 'face-smile-symbolic'},
    '9': {name: '感冒', icon: 'dialog-warning-symbolic'},
    '10': {name: '空气污染', icon: 'weather-fog-symbolic'},
    '11': {name: '空调', icon: 'weather-snow-symbolic'},
    '13': {name: '化妆', icon: 'view-reveal-symbolic'},
    '14': {name: '晾晒', icon: 'weather-few-clouds-symbolic'},
    '15': {name: '交通', icon: 'dialog-information-symbolic'},
    '16': {name: '防晒', icon: 'weather-clear-symbolic'},
};

// ========== 工具函数 ==========

function _svIcon(code) {
    return SV_ICON[parseInt(code)] || 'weather-severe-alert-symbolic';
}

function _qwIcon(code) {
    const c = parseInt(code);
    if (c === 100 || c === 900) return 'weather-clear-symbolic';
    if (c === 150) return 'weather-clear-night-symbolic';
    if (c >= 101 && c <= 103) return 'weather-few-clouds-symbolic';
    if (c >= 151 && c <= 153) return 'weather-few-clouds-night-symbolic';
    if (c === 104) return 'weather-overcast-symbolic';
    if (c >= 302 && c <= 304) return 'weather-storm-symbolic';
    if ([300, 301, 350, 351].includes(c)) return 'weather-showers-scattered-symbolic';
    if ((c >= 305 && c <= 318) || c === 399) return 'weather-showers-symbolic';
    if ((c >= 400 && c <= 410) || (c >= 456 && c <= 457) || c === 499 || c === 901)
        return 'weather-snow-symbolic';
    if (c >= 500 && c <= 515) return 'weather-fog-symbolic';
    return 'weather-severe-alert-symbolic';
}

function _dayName(dateStr, i) {
    if (i === 0) return '今天';
    if (i === 1) return '明天';
    if (i === 2) return '后天';
    const d = new Date(dateStr);
    const w = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return `${dateStr.slice(5)} ${w[d.getDay()]}`;
}

function _currentMonth() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ========== 面板天气指示器 ==========

const WeatherIndicator = GObject.registerClass(
class WeatherIndicator extends PanelMenu.Button {
    _init(ext) {
        super._init(0.5, 'Seniverse Weather');
        this._ext = ext;
        this._settings = ext.getSettings();
        this._extPath = ext.path;
        this._session = new Soup.Session();
        this._cancellable = new Gio.Cancellable();
        this._timerId = null;
        this._weatherCache = null;

        // 面板按钮
        const panelBox = new St.BoxLayout({style_class: 'panel-status-menu-box'});
        this._panelIcon = new St.Icon({
            icon_name: 'weather-overcast-symbolic',
            style_class: 'system-status-icon',
        });
        this._panelLabel = new St.Label({
            text: '...', y_align: Clutter.ActorAlign.CENTER,
        });
        panelBox.add_child(this._panelIcon);
        panelBox.add_child(this._panelLabel);
        this.add_child(panelBox);

        this._buildMenu();

        this._settingsId = this._settings.connect('changed', (_s, key) => {
            const refreshKeys = [
                'api-key', 'city-id', 'city-name', 'weather-provider',
                'qweather-key', 'qweather-host', 'qweather-city-id',
            ];
            if (refreshKeys.includes(key))
                this._refreshWeather();
            else if (key === 'update-interval')
                this._startTimer();
        });

        this._refreshWeather();
        this._startTimer();
    }

    // ---------- 和风天气 SVG 图标 ----------
    _makeQWIcon(qwCode, size) {
        const useQW = this._settings.get_boolean('use-qweather-icons');
        if (!useQW)
            return new St.Icon({icon_name: _qwIcon(qwCode), icon_size: size});
        const path = `${this._extPath}/icons/${qwCode}.svg`;
        const file = Gio.File.new_for_path(path);
        if (file.query_exists(null)) {
            return new St.Icon({
                gicon: Gio.FileIcon.new(file),
                icon_size: size, style_class: 'sw-qw-icon',
            });
        }
        return new St.Icon({icon_name: _qwIcon(qwCode), icon_size: size});
    }

    // 心知天气代码对应的图标
    _makeSVIcon(svCode, size) {
        const useQW = this._settings.get_boolean('use-qweather-icons');
        if (useQW) {
            const qwCode = SV_TO_QW[parseInt(svCode)];
            if (qwCode) return this._makeQWIcon(qwCode, size);
        }
        return new St.Icon({icon_name: _svIcon(svCode), icon_size: size});
    }

    // 根据 provider 和 code 返回图标
    _makeWeatherIcon(code, size, isQW) {
        return isQW ? this._makeQWIcon(code, size) : this._makeSVIcon(code, size);
    }

    // 更新面板图标 (面板只使用系统图标以保持大小一致)
    _setPanelIcon(code, isQW) {
        this._panelIcon.set_icon_name(isQW ? _qwIcon(code) : _svIcon(code));
    }

    // ---------- 构建弹出菜单 ----------
    _buildMenu() {
        this.menu.removeAll();

        // 当前天气
        const curItem = new PopupMenu.PopupBaseMenuItem({reactive: false});
        const curBox = new St.BoxLayout({
            vertical: true, x_expand: true, style_class: 'sw-current-box',
        });
        const hRow = new St.BoxLayout({x_expand: true});
        this._curIconBin = new St.Bin({style_class: 'sw-current-icon'});
        this._curIconBin.set_child(new St.Icon({
            icon_name: 'weather-overcast-symbolic', icon_size: 48,
        }));
        const hRight = new St.BoxLayout({
            vertical: true, x_expand: true, style: 'margin-left: 12px;',
        });
        this._cityLabel = new St.Label({text: '加载中...', style_class: 'sw-city'});
        const tRow = new St.BoxLayout();
        this._tempLabel = new St.Label({text: '--°C', style_class: 'sw-temp'});
        this._descLabel = new St.Label({
            text: '', style_class: 'sw-desc', y_align: Clutter.ActorAlign.END,
        });
        tRow.add_child(this._tempLabel);
        tRow.add_child(this._descLabel);
        hRight.add_child(this._cityLabel);
        hRight.add_child(tRow);
        hRow.add_child(this._curIconBin);
        hRow.add_child(hRight);
        this._timeLabel = new St.Label({text: '', style_class: 'sw-update-time'});
        this._callCountLabel = new St.Label({text: '', style_class: 'sw-update-time'});
        // 空气质量行
        this._aqiLabel = new St.Label({text: '', style_class: 'sw-aqi'});
        this._aqiLabel.visible = false;
        curBox.add_child(hRow);
        curBox.add_child(this._aqiLabel);
        curBox.add_child(this._timeLabel);
        curBox.add_child(this._callCountLabel);
        curItem.add_child(curBox);
        this.menu.addMenuItem(curItem);

        // 近三天预报
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem('近三天预报'));
        this._forecastSection = new PopupMenu.PopupMenuSection();
        this.menu.addMenuItem(this._forecastSection);

        // 15天子菜单
        this._dailySub = new PopupMenu.PopupSubMenuMenuItem('未来15天预报');
        this.menu.addMenuItem(this._dailySub);

        // 生活指数子菜单
        this._lifeSub = new PopupMenu.PopupSubMenuMenuItem('生活指数');
        this.menu.addMenuItem(this._lifeSub);

        // 操作按钮
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        const refreshItem = new PopupMenu.PopupMenuItem('刷新天气');
        refreshItem.connect('activate', () => this._refreshWeather());
        this.menu.addMenuItem(refreshItem);
        const settingsItem = new PopupMenu.PopupMenuItem('天气设置');
        settingsItem.connect('activate', () => this._ext.openPreferences());
        this.menu.addMenuItem(settingsItem);
    }

    // ---------- HTTP ----------
    _httpGet(url, callback) {
        const msg = Soup.Message.new('GET', url);
        this._session.send_and_read_async(
            msg, GLib.PRIORITY_DEFAULT, this._cancellable,
            (session, result) => {
                try {
                    const bytes = session.send_and_read_finish(result);
                    const text = new TextDecoder().decode(bytes.get_data());
                    callback(JSON.parse(text), null);
                } catch (e) {
                    callback(null, e);
                }
            },
        );
    }

    // ---------- API 调用计数 ----------
    _trackCall() {
        const month = _currentMonth();
        if (this._settings.get_string('api-call-month') !== month) {
            this._settings.set_string('api-call-month', month);
            this._settings.set_int('api-call-count', 0);
        }
        const count = this._settings.get_int('api-call-count') + 1;
        this._settings.set_int('api-call-count', count);
        return count;
    }

    _canCall() {
        const month = _currentMonth();
        if (this._settings.get_string('api-call-month') !== month) return true;
        return this._settings.get_int('api-call-count') < MONTHLY_CALL_LIMIT;
    }

    _updateCallCountDisplay() {
        if (this._settings.get_string('weather-provider') === 'qweather') {
            const count = this._settings.get_int('api-call-count');
            this._callCountLabel.set_text(`本月API调用: ${count} / 10000`);
            this._callCountLabel.visible = true;
        } else {
            this._callCountLabel.visible = false;
        }
    }

    // ---------- 刷新天气 ----------
    _refreshWeather() {
        const provider = this._settings.get_string('weather-provider');
        if (provider === 'qweather') {
            const key = this._settings.get_string('qweather-key');
            const host = this._settings.get_string('qweather-host');
            if (!key || !host) {
                this._showStatus('请在设置中配置和风天气 API Key 和 Host');
                return;
            }
            if (!this._canCall()) {
                this._showStatus('本月API调用已接近上限，暂停请求');
                this._updateCallCountDisplay();
                return;
            }
            this._fetchQWeather(key, host);
        } else {
            const key = this._settings.get_string('api-key');
            if (!key) {
                this._showStatus('请在设置中配置心知天气 API Key');
                return;
            }
            this._fetchSeniverse(key);
        }
        this._updateCallCountDisplay();
    }

    _showStatus(msg) {
        this._panelLabel.set_text('--');
        this._cityLabel.set_text(msg);
        this._tempLabel.set_text('');
        this._descLabel.set_text('');
        this._timeLabel.set_text('');
        this._aqiLabel.visible = false;
    }

    // ---------- 心知天气 ----------
    _fetchSeniverse(apiKey) {
        const city = this._settings.get_string('city-id');
        const p = `key=${apiKey}&location=${encodeURIComponent(city)}&language=zh-Hans&unit=c`;

        this._httpGet(`${API_SENIVERSE}/weather/now.json?${p}`, (data, err) => {
            if (err || data?.status_code || !data?.results?.[0]) {
                this._showStatus(`获取失败: ${data?.status || '网络错误'}`);
                return;
            }
            const r = data.results[0], n = r.now;
            this._setCurrent(n.code, n.temperature, n.text, r.location.name,
                r.last_update?.replace('T', ' ').slice(0, 16), false);
            this._aqiLabel.visible = false;
        });

        this._httpGet(`${API_SENIVERSE}/weather/daily.json?${p}&start=0&days=15`, (data, err) => {
            if (err || !data?.results?.[0]) return;
            const days = (data.results[0].daily || []).map(d => ({
                date: d.date, code: d.code_day, text: d.text_day,
                high: d.high, low: d.low, isQW: false,
            }));
            this._updateForecast(days);
        });

        this._httpGet(`${API_SENIVERSE}/life/suggestion.json?${p}`, (data, err) => {
            if (err || !data?.results?.[0]) return;
            const items = Object.entries(data.results[0].suggestion || {}).map(([k, v]) => {
                const info = SV_LIFE[k] || {name: k, icon: 'dialog-question-symbolic'};
                return {name: info.name, icon: info.icon, brief: v.brief};
            });
            this._updateLife(items);
        });
    }

    // ---------- 和风天气 ----------
    _fetchQWeather(apiKey, host) {
        const city = this._settings.get_string('qweather-city-id');
        const base = `https://${host}`;
        const p = `location=${encodeURIComponent(city)}&key=${apiKey}&lang=zh`;

        this._trackCall();
        this._httpGet(`${base}/v7/weather/now?${p}`, (data, err) => {
            if (err || data?.code !== '200') {
                this._showStatus(`获取失败: ${data?.code || '网络错误'}`);
                return;
            }
            const n = data.now;
            const cityName = this._settings.get_string('city-name');
            this._setCurrent(n.icon, n.temp, n.text, cityName,
                data.updateTime?.replace('T', ' ').slice(0, 16), true);
        });

        this._trackCall();
        this._httpGet(`${base}/v7/weather/15d?${p}`, (data, err) => {
            if (err || data?.code !== '200') return;
            const days = (data.daily || []).map(d => ({
                date: d.fxDate, code: d.iconDay, text: d.textDay,
                high: d.tempMax, low: d.tempMin, isQW: true,
            }));
            this._updateForecast(days);
        });

        this._trackCall();
        this._httpGet(`${base}/v7/indices/1d?${p}&type=0`, (data, err) => {
            if (err || data?.code !== '200') return;
            const items = (data.daily || []).map(d => {
                const info = QW_LIFE[d.type] || {name: d.name, icon: 'dialog-question-symbolic'};
                return {name: info.name || d.name, icon: info.icon, brief: d.category};
            });
            this._updateLife(items);
        });

        // 空气质量 (需要经纬度，从城市信息获取)
        this._trackCall();
        this._httpGet(`${base}/geo/v2/city/lookup?${p}`, (data, err) => {
            if (err || data?.code !== '200' || !data?.location?.[0]) return;
            const loc = data.location[0];
            this._trackCall();
            this._httpGet(
                `${base}/airquality/v1/current/${loc.lat}/${loc.lon}?key=${apiKey}&lang=zh`,
                (aqData, aqErr) => {
                    if (aqErr || !aqData?.indexes) return;
                    this._updateAqi(aqData);
                },
            );
        });
    }

    // ---------- 通用 UI 更新 ----------
    _setCurrent(code, temp, text, city, updateTime, isQW) {
        this._setPanelIcon(code, isQW);
        this._panelLabel.set_text(`${temp}°`);
        this._curIconBin.set_child(this._makeWeatherIcon(code, 48, isQW));
        this._cityLabel.set_text(city);
        this._tempLabel.set_text(`${temp}°C`);
        this._descLabel.set_text(`  ${text}`);
        this._timeLabel.set_text(updateTime ? `更新于 ${updateTime}` : '');
        this._weatherCache = {
            code, temp, text, city, isQW,
            sysIcon: isQW ? _qwIcon(code) : _svIcon(code),
        };
    }

    _updateAqi(aqData) {
        const idx = aqData.indexes?.find(i => i.code === 'qaqi') || aqData.indexes?.[0];
        if (!idx) {
            this._aqiLabel.visible = false;
            return;
        }
        const pollutant = idx.primaryPollutant?.name || '';
        this._aqiLabel.set_text(
            `空气质量: ${idx.category} (AQI ${idx.aqiDisplay})${pollutant ? ' · ' + pollutant : ''}`,
        );
        this._aqiLabel.visible = true;
    }

    _updateForecast(days) {
        this._forecastSection.removeAll();
        const three = days.slice(0, 3);
        for (let i = 0; i < three.length; i++)
            this._forecastSection.addMenuItem(this._makeForecastRow(three[i], i, 60));

        this._dailySub.menu.removeAll();
        if (days.length <= 3) {
            this._dailySub.label.set_text('未来15天预报 (需付费API)');
            this._dailySub.setSensitive(false);
        } else {
            this._dailySub.label.set_text(`未来${days.length}天预报`);
            this._dailySub.setSensitive(true);
        }
        for (let i = 0; i < days.length; i++)
            this._dailySub.menu.addMenuItem(this._makeForecastRow(days[i], i, 90));
    }

    _makeForecastRow(d, index, dayWidth) {
        const item = new PopupMenu.PopupBaseMenuItem({reactive: false});
        const box = new St.BoxLayout({x_expand: true, style_class: 'sw-forecast-row'});
        const dayLabel = new St.Label({
            text: _dayName(d.date, index), style_class: 'sw-forecast-day',
        });
        dayLabel.set_width(dayWidth);
        box.add_child(dayLabel);
        const iconSize = dayWidth > 60 ? 18 : 20;
        box.add_child(this._makeWeatherIcon(d.code, iconSize, d.isQW));
        box.add_child(new St.Label({
            text: ` ${d.text}`, x_expand: true, style_class: 'sw-forecast-text',
        }));
        box.add_child(new St.Label({
            text: `${d.high}° / ${d.low}°`, style_class: 'sw-forecast-temp',
        }));
        item.add_child(box);
        return item;
    }

    _updateLife(items) {
        this._lifeSub.menu.removeAll();
        if (!items.length) {
            const m = new PopupMenu.PopupMenuItem('暂无数据');
            m.setSensitive(false);
            this._lifeSub.menu.addMenuItem(m);
            return;
        }
        for (const it of items) {
            const item = new PopupMenu.PopupBaseMenuItem({reactive: false});
            const box = new St.BoxLayout({x_expand: true, style_class: 'sw-life-row'});
            box.add_child(new St.Icon({
                icon_name: it.icon, icon_size: 16, style_class: 'sw-life-icon',
            }));
            const nameLabel = new St.Label({text: it.name, style_class: 'sw-life-name'});
            nameLabel.set_width(70);
            box.add_child(nameLabel);
            box.add_child(new St.Label({
                text: it.brief || '', style_class: 'sw-life-brief', x_expand: true,
            }));
            item.add_child(box);
            this._lifeSub.menu.addMenuItem(item);
        }
    }

    // ---------- 定时刷新 ----------
    _startTimer() {
        this._stopTimer();
        const mins = Math.max(this._settings.get_int('update-interval'), 15);
        this._timerId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT, mins * 60, () => {
                this._refreshWeather();
                return GLib.SOURCE_CONTINUE;
            },
        );
    }

    _stopTimer() {
        if (this._timerId) {
            GLib.source_remove(this._timerId);
            this._timerId = null;
        }
    }

    destroy() {
        this._stopTimer();
        this._cancellable.cancel();
        if (this._settingsId) {
            this._settings.disconnect(this._settingsId);
            this._settingsId = null;
        }
        this._session = null;
        super.destroy();
    }
});

// ========== 主扩展类 ==========

export default class SeniverseWeatherExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._indicator = new WeatherIndicator(this);

        // 面板位置: left / center / right
        const pos = this._settings.get_string('panel-position') || 'right';
        const idx = this._settings.get_int('panel-index');
        Main.panel.addToStatusArea(this.uuid, this._indicator, idx, pos);

        this._setupCalendar();

        // 监听面板位置变化
        this._posChangedId = this._settings.connect('changed', (_s, key) => {
            if (key === 'panel-position' || key === 'panel-index')
                this._repositionIndicator();
        });
    }

    disable() {
        if (this._posChangedId) {
            this._settings.disconnect(this._posChangedId);
            this._posChangedId = null;
        }
        this._removeCalendar();
        this._indicator?.destroy();
        this._indicator = null;
        this._settings = null;
    }

    _repositionIndicator() {
        if (!this._indicator) return;
        const container = this._indicator.container;
        const parent = container.get_parent();
        if (parent) parent.remove_child(container);

        const pos = this._settings.get_string('panel-position') || 'right';
        const idx = this._settings.get_int('panel-index');
        const box = pos === 'left' ? Main.panel._leftBox
            : pos === 'center' ? Main.panel._centerBox
                : Main.panel._rightBox;
        box.insert_child_at_index(container, idx);
    }

    // ---------- 日历集成 ----------
    _setupCalendar() {
        try {
            if (!this._settings.get_boolean('show-in-calendar')) return;
            const dm = Main.panel.statusArea.dateMenu;
            if (!dm?._calendar) return;

            this._calBox = new St.BoxLayout({
                style_class: 'sw-cal-box', vertical: false, x_expand: true,
            });
            this._calIcon = new St.Icon({
                icon_name: 'weather-overcast-symbolic', icon_size: 22,
            });
            this._calLabel = new St.Label({
                text: '天气加载中...', style_class: 'sw-cal-label',
                y_align: Clutter.ActorAlign.CENTER,
            });
            this._calBox.add_child(this._calIcon);
            this._calBox.add_child(this._calLabel);

            const parent = dm._calendar.get_parent();
            if (parent) parent.add_child(this._calBox);

            this._menuOpenId = dm.menu.connect('open-state-changed', (_m, isOpen) => {
                if (isOpen) this._updateCalendar();
            });
        } catch (e) {
            log(`[SeniverseWeather] 日历集成失败: ${e.message}`);
        }
    }

    _updateCalendar() {
        const w = this._indicator?._weatherCache;
        if (!w || !this._calLabel) return;
        this._calIcon.set_icon_name(w.sysIcon);
        this._calLabel.set_text(`${w.city} ${w.temp}°C ${w.text}`);
    }

    _removeCalendar() {
        if (this._menuOpenId) {
            try { Main.panel.statusArea.dateMenu?.menu.disconnect(this._menuOpenId); }
            catch (_) {}
            this._menuOpenId = null;
        }
        if (this._calBox) {
            this._calBox.get_parent()?.remove_child(this._calBox);
            this._calBox.destroy();
            this._calBox = null;
        }
    }
}
