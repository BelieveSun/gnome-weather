import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import GLib from 'gi://GLib';
import Soup from 'gi://Soup?version=3.0';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const API_SENIVERSE = 'https://api.seniverse.com/v3';

export default class SeniverseWeatherPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        const page = new Adw.PreferencesPage({
            title: '天气设置', icon_name: 'weather-overcast-symbolic',
        });
        window.add(page);

        // ===== 数据源选择 =====
        const providerGroup = new Adw.PreferencesGroup({title: '数据源'});
        page.add(providerGroup);

        const providerRow = new Adw.ComboRow({
            title: '天气数据源',
            subtitle: '选择天气API提供商',
            model: Gtk.StringList.new(['心知天气 (Seniverse)', '和风天气 (QWeather)']),
        });
        const providerMap = ['seniverse', 'qweather'];
        providerRow.set_selected(
            Math.max(0, providerMap.indexOf(settings.get_string('weather-provider'))),
        );
        providerGroup.add(providerRow);

        // ===== 心知天气设置 =====
        const svGroup = new Adw.PreferencesGroup({
            title: '心知天气',
            description: '在 seniverse.com 注册获取 API Key',
        });
        page.add(svGroup);

        const svKeyRow = new Adw.PasswordEntryRow({title: 'API Key'});
        svKeyRow.set_text(settings.get_string('api-key'));
        svKeyRow.connect('changed', () => settings.set_string('api-key', svKeyRow.get_text()));
        svGroup.add(svKeyRow);

        // ===== 和风天气设置 =====
        const qwGroup = new Adw.PreferencesGroup({
            title: '和风天气',
            description: '在 console.qweather.com 创建项目获取 API Key 和 Host',
        });
        page.add(qwGroup);

        const qwKeyRow = new Adw.PasswordEntryRow({title: 'API Key'});
        qwKeyRow.set_text(settings.get_string('qweather-key'));
        qwKeyRow.connect('changed', () => settings.set_string('qweather-key', qwKeyRow.get_text()));
        qwGroup.add(qwKeyRow);

        const qwHostRow = new Adw.EntryRow({
            title: 'API Host',
            text: settings.get_string('qweather-host'),
        });
        qwHostRow.connect('changed', () => settings.set_string('qweather-host', qwHostRow.get_text()));
        qwGroup.add(qwHostRow);

        const callCountRow = new Adw.ActionRow({
            title: '本月API调用次数',
            subtitle: `${settings.get_int('api-call-count')} / 10000`,
        });
        qwGroup.add(callCountRow);

        // 根据数据源显隐设置组
        const updateVisibility = () => {
            const isSV = providerMap[providerRow.get_selected()] === 'seniverse';
            svGroup.visible = isSV;
            qwGroup.visible = !isSV;
        };
        updateVisibility();
        providerRow.connect('notify::selected', () => {
            settings.set_string('weather-provider', providerMap[providerRow.get_selected()]);
            updateVisibility();
        });

        // ===== 城市设置 =====
        const cityGroup = new Adw.PreferencesGroup({title: '城市设置'});
        page.add(cityGroup);

        const currentCityRow = new Adw.ActionRow({
            title: '当前城市',
            subtitle: settings.get_string('city-name') || '未设置',
        });
        currentCityRow.add_suffix(new Gtk.Image({icon_name: 'emblem-ok-symbolic'}));
        cityGroup.add(currentCityRow);

        const searchRow = new Adw.EntryRow({
            title: '搜索城市', show_apply_button: true,
        });
        cityGroup.add(searchRow);

        // 搜索结果
        const resultsGroup = new Adw.PreferencesGroup({title: '搜索结果'});
        page.add(resultsGroup);
        this._resultRows = [];

        searchRow.connect('apply', () => {
            const q = searchRow.get_text();
            if (q) {
                const provider = providerMap[providerRow.get_selected()];
                this._searchCity(settings, q, currentCityRow, resultsGroup, provider);
            }
        });

        // ===== 面板设置 =====
        const panelGroup = new Adw.PreferencesGroup({title: '面板设置'});
        page.add(panelGroup);

        const positionRow = new Adw.ComboRow({
            title: '面板位置',
            subtitle: '天气指示器在顶栏中的位置',
            model: Gtk.StringList.new(['左侧 (Left)', '中间 (Center)', '右侧 (Right)']),
        });
        const posMap = ['left', 'center', 'right'];
        positionRow.set_selected(
            Math.max(0, posMap.indexOf(settings.get_string('panel-position'))),
        );
        positionRow.connect('notify::selected', () => {
            settings.set_string('panel-position', posMap[positionRow.get_selected()]);
        });
        panelGroup.add(positionRow);

        const posIndexRow = new Adw.SpinRow({
            title: '位置索引',
            subtitle: '数值越小越靠左，0为最左',
            adjustment: new Gtk.Adjustment({
                lower: 0, upper: 20, step_increment: 1,
                value: settings.get_int('panel-index'),
            }),
        });
        posIndexRow.connect('notify::value', () => {
            settings.set_int('panel-index', Math.round(posIndexRow.get_value()));
        });
        panelGroup.add(posIndexRow);

        // ===== 显示设置 =====
        const displayGroup = new Adw.PreferencesGroup({title: '显示设置'});
        page.add(displayGroup);

        const intervalRow = new Adw.SpinRow({
            title: '更新间隔（分钟）',
            subtitle: '和风天气建议≥20分钟以控制调用量',
            adjustment: new Gtk.Adjustment({
                lower: 15, upper: 120, step_increment: 5,
                value: settings.get_int('update-interval'),
            }),
        });
        intervalRow.connect('notify::value', () => {
            settings.set_int('update-interval', Math.round(intervalRow.get_value()));
        });
        displayGroup.add(intervalRow);

        const qwIconRow = new Adw.SwitchRow({
            title: '使用和风天气图标',
            subtitle: '弹出菜单中使用和风天气SVG彩色图标',
            active: settings.get_boolean('use-qweather-icons'),
        });
        qwIconRow.connect('notify::active', () => {
            settings.set_boolean('use-qweather-icons', qwIconRow.get_active());
        });
        displayGroup.add(qwIconRow);

        const calendarRow = new Adw.SwitchRow({
            title: '日历面板显示天气',
            subtitle: '使用缓存数据，不额外消耗API调用',
            active: settings.get_boolean('show-in-calendar'),
        });
        calendarRow.connect('notify::active', () => {
            settings.set_boolean('show-in-calendar', calendarRow.get_active());
        });
        displayGroup.add(calendarRow);
    }

    // ---------- 城市搜索 ----------
    _searchCity(settings, query, currentCityRow, resultsGroup, provider) {
        for (const row of this._resultRows) resultsGroup.remove(row);
        this._resultRows = [];

        const loadingRow = new Adw.ActionRow({title: '搜索中...'});
        resultsGroup.add(loadingRow);
        this._resultRows.push(loadingRow);

        if (provider === 'qweather')
            this._searchQWeather(settings, query, currentCityRow, resultsGroup);
        else
            this._searchSeniverse(settings, query, currentCityRow, resultsGroup);
    }

    _searchSeniverse(settings, query, currentCityRow, resultsGroup) {
        const apiKey = settings.get_string('api-key');
        if (!apiKey) {
            this._clearAndShowMsg(resultsGroup, '请先填写心知天气 API Key');
            return;
        }
        const url = `${API_SENIVERSE}/location/search.json?key=${apiKey}&q=${encodeURIComponent(query)}`;
        this._doSearch(url, resultsGroup, (data) => {
            if (!data?.results?.length)
                return this._clearAndShowMsg(resultsGroup, data?.status || '未找到城市');

            this._clearResults(resultsGroup);
            for (const city of data.results) {
                const row = new Adw.ActionRow({
                    title: city.name, subtitle: city.path || '', activatable: true,
                });
                row.add_suffix(new Gtk.Image({icon_name: 'go-next-symbolic'}));
                row.connect('activated', () => {
                    settings.set_string('city-id', city.id);
                    settings.set_string('city-name', city.name);
                    currentCityRow.set_subtitle(city.name);
                });
                resultsGroup.add(row);
                this._resultRows.push(row);
            }
        });
    }

    _searchQWeather(settings, query, currentCityRow, resultsGroup) {
        const apiKey = settings.get_string('qweather-key');
        const host = settings.get_string('qweather-host');
        if (!apiKey || !host) {
            this._clearAndShowMsg(resultsGroup, '请先填写和风天气 API Key 和 Host');
            return;
        }
        const url = `https://${host}/geo/v2/city/lookup?location=${encodeURIComponent(query)}&key=${apiKey}&lang=zh`;
        this._doSearch(url, resultsGroup, (data) => {
            if (data?.code !== '200' || !data?.location?.length)
                return this._clearAndShowMsg(resultsGroup, `未找到城市 (code: ${data?.code})`);

            this._clearResults(resultsGroup);
            for (const city of data.location) {
                const path = [city.adm1, city.adm2, city.country].filter(Boolean).join(', ');
                const row = new Adw.ActionRow({
                    title: city.name, subtitle: path, activatable: true,
                });
                row.add_suffix(new Gtk.Image({icon_name: 'go-next-symbolic'}));
                row.connect('activated', () => {
                    settings.set_string('qweather-city-id', city.id);
                    settings.set_string('city-name', city.name);
                    currentCityRow.set_subtitle(city.name);
                });
                resultsGroup.add(row);
                this._resultRows.push(row);
            }
        });
    }

    _doSearch(url, resultsGroup, onData) {
        const session = new Soup.Session();
        const msg = Soup.Message.new('GET', url);
        session.send_and_read_async(msg, GLib.PRIORITY_DEFAULT, null, (sess, result) => {
            try {
                const bytes = sess.send_and_read_finish(result);
                const text = new TextDecoder().decode(bytes.get_data());
                onData(JSON.parse(text));
            } catch (e) {
                this._clearAndShowMsg(resultsGroup, `搜索失败: ${e.message}`);
            }
        });
    }

    _clearResults(group) {
        for (const row of this._resultRows) group.remove(row);
        this._resultRows = [];
    }

    _clearAndShowMsg(group, msg) {
        this._clearResults(group);
        const row = new Adw.ActionRow({title: msg});
        group.add(row);
        this._resultRows.push(row);
    }
}
