import {
    action,
    computed,
    intercept,
    IObservableArray,
    observable,
    ObservableMap,
    toJS,
} from 'mobx';
import { localeMapper as locales } from 'utils/constants';

class CitationStore {
    @observable CSL: ObservableMap<CSL.Data>;
    @observable private byIndex: IObservableArray<Citeproc.Citation>;

    constructor(byIndex: Citeproc.CitationByIndex, CSL: { [id: string]: CSL.Data }) {
        this.byIndex = observable(byIndex);
        this.CSL = this.cleanCSL(CSL);
        intercept(this.CSL, change => {
            if (change.type !== 'add' || !change.newValue) {
                return change;
            }

            if (!change.newValue.title) {
                return null;
            }

            const title = change.newValue.title.toLowerCase();
            const matchIndex: number = this.CSL.values().findIndex(v => {
                return v.title !== undefined && v.title.toLowerCase() === title;
            });

            if (matchIndex > -1) {
                const match = toJS(this.CSL.get(this.CSL.keys()[matchIndex]));
                const deepMatch = Object.keys(change.newValue).every((k: keyof CSL.Data) => {
                    const isComplexDataType =
                        typeof change.newValue![k] !== 'string' &&
                        typeof change.newValue![k] !== 'number';
                    const isVariableKey = k === 'id' || k === 'language';
                    return isComplexDataType || isVariableKey
                        ? true
                        : change.newValue![k] === match![k];
                });
                if (deepMatch) return null;
            }

            return change;
        });
    }

    /**
     * Returns an array of CSL.Data for all uncited references
     */
    @computed
    get uncited(): CSL.Data[] {
        return this.CSL
            .keys()
            .reduce(
                (prev, curr) => {
                    if (!this.citedIDs.includes(curr)) prev.push(this.CSL.get(curr)!);
                    return prev;
                },
                <CSL.Data[]>[],
            )
            .slice();
    }

    /**
     * Returns an array of CSL.Data for all cited references
     */
    @computed
    get cited(): CSL.Data[] {
        return this.citedIDs.map(id => this.CSL.get(id)!).slice();
    }

    /**
     * Returns an array of CSL IDs for all cited CSL
     */
    @computed
    get citedIDs(): string[] {
        return this.citationByIndex
            .map(i => i.citationItems.map(j => j.id))
            .reduce((prev, curr) => [...prev, ...curr], [])
            .reduce((p, c) => (!p.includes(c) ? [...p, c] : p), <string[]>[])
            .slice();
    }

    /**
     * Given an array of CSL.Data, merge the array into this.CSL
     * @param data - Array of CSL.Data to be merged
     */
    @action
    addItems(data: CSL.Data[]): CSL.Data[] {
        this.CSL.merge(
            data.reduce(
                (prev, curr) => {
                    prev[curr.id] = curr;
                    return prev;
                },
                <{ [id: string]: CSL.Data }>{},
            ),
        );
        // This is necessary in case one of the values is a duplicate and gets
        // intercepted.
        let payload: CSL.Data[] = [];
        for (const item of data) {
            const csl = this.CSL.values().find(val => {
                for (const key of Object.keys(item)) {
                    if (typeof item[<keyof CSL.Data>key] === 'object' || key === 'id') continue;
                    if (item[<keyof CSL.Data>key] !== val[<keyof CSL.Data>key]) return false;
                }
                return true;
            });
            payload = [...payload, toJS(csl!)];
        }
        return payload;
    }

    @action
    init(byIndex: Citeproc.CitationByIndex) {
        this.byIndex.replace(JSON.parse(JSON.stringify(byIndex)));
    }

    /**
     * Given an array of current citationIds, remove all elements from byIndex where
     * the citationId of the index does not exist in the given array of citationIds
     * @param citationIds - Array of current citationIds
     */
    @action
    pruneOrphanedCitations(citationIds: string[]): void {
        this.byIndex.replace(
            this.byIndex.filter(citation => citationIds.includes(citation.citationID)),
        );
    }

    /**
     * Given an array of CSL citation IDs, delete all matching CSL from this.CSL and prune this.byIndex.
     * @param idList - String of CSL IDs to be removed
     * @return Array of HTML element IDs to remove from the document
     */
    @action
    removeItems(idList: string[]): string[] {
        idList.forEach(id => {
            if (!this.citedIDs.includes(id)) this.CSL.delete(id);
        });
        const toRemove: Set<string> = new Set();
        const byIndex = this.citationByIndex
            .map(i => ({
                ...i,
                citationItems: i.citationItems.filter(j => !idList.includes(j.id)),
            }))
            .reduce((prev, curr) => {
                if (curr.citationItems.length === 0 && curr.citationID) {
                    toRemove.add(curr.citationID);
                    return prev;
                }
                return [...prev, curr];
            }, []);
        this.init(byIndex);
        return Array.from(toRemove);
    }

    /**
     * Returns an object of ids and titles from the CSL map for easy consumption
     */
    get lookup(): { ids: string[]; titles: string[] } {
        return {
            ids: this.CSL.keys(),
            titles: this.CSL.values().map(v => v.title!),
        };
    }

    /**
     * Returns a JS object of byIndex
     */
    get citationByIndex(): Citeproc.CitationByIndex {
        return toJS(this.byIndex);
    }

    private cleanCSL(CSL: { [id: string]: CSL.Data }): ObservableMap<CSL.Data> {
        for (const key of Object.keys(CSL)) {
            CSL[key].language = locales[CSL[key].language!] || 'en-US';
        }
        return observable.map(CSL);
    }
}

export default class Store {
    bibOptions = {
        heading: '',
        headingLevel: <'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'>'h3',
        style: <'fixed' | 'toggle'>'fixed',
    };

    @observable citations: CitationStore;

    /**
     * The selected citation style
     */
    citationStyle = observable('');

    /**
     * The user's selected link format.
     */
    links: 'always' | 'urls' | 'never' | 'always-full-surround';

    /**
     * The user's locale provided by WordPress.
     */
    locale: string;

    constructor(savedState: ABT.Backend['state']) {
        const { cache, citationByIndex, bibOptions, CSL } = savedState;
        this.citations = new CitationStore(citationByIndex, CSL);
        this.links = cache.links;
        this.locale = cache.locale;
        this.citationStyle.set(cache.style);
        this.bibOptions = bibOptions;
    }

    @computed
    get persistent(): string {
        return JSON.stringify({
            CSL: toJS(this.citations.CSL),
            cache: this.cache,
            citationByIndex: this.citations.citationByIndex,
        });
    }

    @action
    reset() {
        this.citations = new CitationStore([], {});
    }

    @action
    setStyle(style: string) {
        this.citationStyle.set(style);
    }

    get cache() {
        return {
            links: this.links,
            locale: this.locale,
            style: this.citationStyle,
        };
    }
}
