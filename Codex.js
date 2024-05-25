mw.util.addPortletLink('p-tb', mw.util.getUrl('Special:BlankPage/FindAndReplace'), 'Mass Find and Replace');

mw.loader.using('@wikimedia/codex').then(function (require) {
    const Vue = require('vue');
    const Codex = require('@wikimedia/codex');
    const mountPoint = document.getElementById('mw-content-text');
    document.querySelector('#firstHeading').style.display = 'none';

    if (mw.config.get('wgCanonicalSpecialPageName') === 'Blankpage' && mw.config.get('wgTitle').split('/', 2)[1] === 'FindAndReplace') {
        Vue.createMwApp({
            data: function () {
                return {
                    listofPages: '',
                    find: '',
                    replace: '',
                    reason: '',
                    logs: [],
                    api: new mw.Api()
                };
            },
            template: `
            <div style= "border:1px solid; padding:1rem; margin-bottom: 3rem;">
                <div>
                    <h1>Mass Find and Replace</h1>
                    <div>
                        <p>List of Pages:</p>
                        <cdx-text-area
                            v-model="listofPages"
                            aria-label="TextArea with placeholder"
                            placeholder="List of pages"
                            :rows="10"
                        />
                    </div>
                    <div>
                        <p>Find:</p>
                        <cdx-text-input v-model="find" aria-label="Find" placeholder="Find" />
                    </div>
                    <div>
                        <p>Replace:</p>
                        <cdx-text-input v-model="replace" aria-label="Replace" placeholder="Replace" />
                    </div>
                    <div>
                        <p>Reason:</p>
                        <cdx-text-input v-model="reason" aria-label="Reason" placeholder="Reason" />
                    </div>
                    <p>
                    
                        <cdx-button action="progressive" @click="replaceStart" style = "margin-left:20rem;margin-right:3rem;margin-top:2rem;" >Start Replacing</cdx-button>   
                       
                        
                        <cdx-button action="destructive" weight="primary" @click="clearLogs">Cancel</cdx-button>
                        
                    </p>
                    <div v-if="logs.length">
                        <h2>Edit Log</h2>
                        <ol>
                            <li v-for="log in logs" :key="log.page">
                                <span v-html="log.message"></span>
                            </li>
                        </ol>
                    </div>
                </div>
                </div>
            `,
            methods: {
                replaceStart() {
                    const pagesList = this.listofPages.replace(/^\s*[\r\n]/gm, '').split("\n");
                    const find = this.find.trim();
                    const replace = this.replace.trim();
                    const reason = this.reason.trim() + " (By [[meta:Indic-TechCom/Tools|FindAndReplace]])";

                    if (pagesList[0].trim() !== "" && find !== "" && replace !== "") {
                        this.logs = [];

                        pagesList.forEach((page) => {
                            page = page.trim();

                            const getContentParam = {
                                "action": "query",
                                "format": "json",
                                "prop": "revisions",
                                "titles": page,
                                "rvprop": "content",
                                "rvslots": "main",
                                "rvlimit": "1"
                            };

                            this.api.get(getContentParam).done((data) => {
                                let oldText;
                                try {
                                    oldText = data.query.pages[Object.keys(data.query.pages)[0]].revisions[0].slots.main['*'];
                                } catch (e) {
                                    oldText = -1;
                                }

                                if (oldText !== -1) {
                                    const newText = this.safeReplace(oldText, find, replace);
                                    if (newText === oldText) {
                                        this.logs.push({ page: page, message: `<b>${page}</b> has no changes. `});
                                    } else {
                                        const editParams = {
                                            action: 'edit',
                                            title: page,
                                            text: newText,
                                            summary: reason,
                                            format: 'json'
                                        };

                                        this.api.postWithToken('csrf', editParams).done((res) => {
                                            if (res.edit.result === "Success") {
                                                this.logs.push({ page: page, message: `Changes made on <b>${page}</b>` });
                                            } else {
                                                this.logs.push({ page: page, message: `Something went wrong with <b>${page}</b>` });
                                            }
                                        });
                                    }
                                } else {
                                    this.logs.push({ page: page, message: `<b>${page}</b> not found.` });
                                }
                            });
                        });
                    } else {
                        this.missingAlertMsg("any source page, find, or replace string");
                    }
                },

                clearLogs() {
                    this.logs = [];
                },

                missingAlertMsg(str) {
                    alert("Did not find " + str + " :(");
                },

                safeReplace(input, find, replaceText) {
                    const flags = 'g';
                    find = find.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

                    const exclude = '(<!--[\\s\\S]?-->|<(nowiki|math|source|syntaxhighlight|pre|gallery|timeline)[^>]?>[\\s\\S]*?<\\/\\2>)';
                    const re = new RegExp(exclude + '|(' + find + ')', flags.replace(/i|$/, 'i'));
                    return input.replace(re, function (match, g1, g2, g3) {
                        if (g3 !== undefined) {
                            return match.replace(new RegExp(find, flags), replaceText);
                        } else {
                            return match;
                        }
                    });
                }
            }
        })
        .component('cdx-button', Codex.CdxButton)
        .component('cdx-text-area', Codex.CdxTextArea)
        .component('cdx-text-input', Codex.CdxTextInput)
        .mount(mountPoint);
    }
});