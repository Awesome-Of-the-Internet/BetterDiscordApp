import {React, Settings, Strings, Events, Logger, WebpackModules} from "modules";

import Modals from "../modals";
import SettingsTitle from "./title";
import ReloadIcon from "../icons/reload";
import AddonCard from "./addoncard";
import Dropdown from "./components/dropdown";
import Search from "./components/search";
import ErrorBoundary from "../errorboundary";

import ListIcon from "../icons/list";
import GridIcon from "../icons/grid";
import NoResults from "../blankslates/noresults";
import EmptyImage from "../blankslates/emptyimage";

const Tooltip = WebpackModules.getByDisplayName("Tooltip");

export default class AddonList extends React.Component {

    constructor(props) {
        super(props);
        this.state = {sort: "name", ascending: true, query: "", view: "list"};
        this.sort = this.sort.bind(this);
        this.reverse = this.reverse.bind(this);
        this.search = this.search.bind(this);
        this.update = this.update.bind(this);
        this.listView = this.listView.bind(this);
        this.gridView = this.gridView.bind(this);
        this.openFolder = this.openFolder.bind(this);
    }

    componentDidMount() {
        Events.on(`${this.props.prefix}-loaded`, this.update);
        Events.on(`${this.props.prefix}-unloaded`, this.update);
    }

    componentWillUnmount() {
        Events.off(`${this.props.prefix}-loaded`, this.update);
        Events.off(`${this.props.prefix}-unloaded`, this.update);
    }

    update() {
        this.forceUpdate();
    }

    listView() {
        this.setState({view: "list"});
    }

    gridView() {
        this.setState({view: "grid"});
    }

    reload() {
        if (this.props.refreshList) this.props.refreshList();
        this.forceUpdate();
    }

    reverse(value) {
        this.setState({ascending: value});
    }

    sort(value) {
        this.setState({sort: value});
    }

    search(event) {
        this.setState({query: event.target.value.toLocaleLowerCase()});
    }

    openFolder() {
        const shell = require("electron").shell;
        const open = shell.openItem || shell.openPath;
        open(this.props.folder);
    }

    get sortOptions() {
        return [
            {label: Strings.Addons.name, value: "name"},
            {label: Strings.Addons.author, value: "author"},
            {label: Strings.Addons.version, value: "version"},
            {label: Strings.Addons.added, value: "added"},
            {label: Strings.Addons.modified, value: "modified"}
        ];
    }

    get directions() {
        return [
            {label: Strings.Sorting.ascending, value: true},
            {label: Strings.Sorting.descending, value: false}
        ];
    }

    get emptyImage() {
        return <EmptyImage title={Strings.Addons.blankSlateHeader.format({type: this.props.title})} message={Strings.Addons.blankSlateMessage.format({link: "https://betterdiscordlibrary.com/themes", type: this.props.title}).toString()}>
            <button className="bd-button" onClick={this.openFolder}>{Strings.Addons.openFolder.format({type: this.props.title})}</button>
        </EmptyImage>;
    }

    makeControlButton(title, children, action, selected = false) {
        return <Tooltip color="black" position="top" text={title}>
                    {(props) => {
                        return <button {...props} className={"bd-button bd-view-button" + (selected ? " selected" : "")} onClick={action}>{children}</button>;
                    }}
                </Tooltip>;
    }

    render() {
        const {title, folder, addonList, addonState, onChange, reload} = this.props;
        const showReloadIcon = !Settings.get("settings", "addons", "autoReload");
        const button = folder ? {title: Strings.Addons.openFolder.format({type: title}), onClick: this.openFolder} : null;
        let sortedAddons = addonList.sort((a, b) => {
            const first = a[this.state.sort];
            const second = b[this.state.sort];
            if (typeof(first) == "string") return first.toLocaleLowerCase().localeCompare(second.toLocaleLowerCase());
            if (first > second) return 1;
            if (second > first) return -1;
            return 0;
        });
        if (!this.state.ascending) sortedAddons.reverse();
        if (this.state.query) {
            sortedAddons = sortedAddons.filter(addon => {
                let matches = addon.name.toLocaleLowerCase().includes(this.state.query);
                matches = matches || addon.author.toLocaleLowerCase().includes(this.state.query);
                matches = matches || addon.description.toLocaleLowerCase().includes(this.state.query);
                if (!matches) return false;
                return true;
            });
        }
        return [
            <SettingsTitle key="title" text={title} button={button} otherChildren={showReloadIcon && <ReloadIcon className="bd-reload" onClick={this.reload.bind(this)} />} />,
            <div className={"bd-controls bd-addon-controls"}>
                <Search onChange={this.search} placeholder={`${Strings.Addons.search.format({type: this.props.title})}...`} />
                <div className="bd-controls-advanced">
                    <div className="bd-addon-dropdowns">
                        <div className="bd-select-wrapper">
                            <label className="bd-label">{Strings.Sorting.sortBy}:</label>
                            <Dropdown options={this.sortOptions} onChange={this.sort} style="transparent" />
                        </div>
                        <div className="bd-select-wrapper">
                            <label className="bd-label">{Strings.Sorting.order}:</label>
                            <Dropdown options={this.directions} onChange={this.reverse} style="transparent" />
                        </div>
                    </div>
                    <div className="bd-addon-views">
                        {this.makeControlButton("List View", <ListIcon />, this.listView, this.state.view === "list")}
                        {this.makeControlButton("Grid View", <GridIcon />, this.gridView, this.state.view === "grid")}
                    </div>
                </div>
            </div>,
            <div key="addonList" className={"bd-addon-list" + (this.state.view == "grid" ? " bd-grid-view" : "")}>
            {sortedAddons.map(addon => {
                const hasSettings = addon.instance && typeof(addon.instance.getSettingsPanel) === "function";
                const getSettings = hasSettings && addon.instance.getSettingsPanel.bind(addon.instance);
                return <ErrorBoundary><AddonCard editAddon={this.editAddon.bind(this, addon.id)} deleteAddon={this.deleteAddon.bind(this, addon.id)} showReloadIcon={showReloadIcon} key={addon.id} enabled={addonState[addon.id]} addon={addon} onChange={onChange} reload={reload} hasSettings={hasSettings} getSettingsPanel={getSettings} /></ErrorBoundary>;
            })}
            {this.props.addonList.length === 0 && this.emptyImage}
            {this.state.query && sortedAddons.length == 0 && this.props.addonList.length !== 0 && <NoResults />}
            </div>
        ];
    }

    editAddon(id) {
        if (this.props.editAddon) this.props.editAddon(id);
    }

    async deleteAddon(id) {
        const addon = this.props.addonList.find(a => a.id == id);
        const shouldDelete = await this.confirmDelete(addon);
        if (!shouldDelete) return;
        if (this.props.deleteAddon) this.props.deleteAddon(addon);
    }

    confirmDelete(addon) {
        return new Promise(resolve => {
            Modals.showConfirmationModal(Strings.Modals.confirmAction, Strings.Addons.confirmDelete.format({name: addon.name}), {
                danger: true,
                confirmText: Strings.Addons.deleteAddon,
                onConfirm: () => {resolve(true);},
                onCancel: () => {resolve(false);}
            });
        });
    }
}

const originalRender = AddonList.prototype.render;
Object.defineProperty(AddonList.prototype, "render", {
    enumerable: false,
    configurable: false,
    set: function() {Logger.warn("AddonList", "Addon policy for plugins #5 https://github.com/rauenzi/BetterDiscordApp/wiki/Addon-Policies#plugins");},
    get: () => originalRender
});