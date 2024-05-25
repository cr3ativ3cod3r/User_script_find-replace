const dialogTrigger = mw.util.addPortletLink('p-tb', '#', 'Mass Find and Replace');

mw.loader.using('@wikimedia/codex').then(function (require) {
    const Vue = require('vue');
    const Codex = require('@wikimedia/codex');
    const mountPoint = document.body.appendChild(document.createElement('div'));

    Vue.createMwApp({
        data: function () {
            return {
                showDialog: false,
                listofPages: '',
                find: '',
                replace: '',
                reason: '',
                divLog: '',
                orderedList: '',
                api: new mw.Api()
            };
        },
        template: `
            <cdx-dialog v-model:open="showDialog"
                title="Mass Find and Replace"
                close-button-label="Close"
                :default-action="replaceStart"
            >
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
    				<cdx-button action="progressive"@click="replaceStart" >Start Replacing</cdx-button>   
    				 <cdx-button action="destructive" weight="primary" @click="showDialog = false">Cancel</cdx-button>
    			</p>
                
            </cdx-dialog>
        `,
        methods: {
            replaceStart() {
                const pagesList = this.listofPages.replace(/^\s*[\r\n]/gm, '').split("\n");
                const find = this.find.trim();
                const replace = this.replace.trim();
                const reason = this.reason.trim() + " (By [[meta:Indic-TechCom/Tools|FindAndReplace]])";

                if (pagesList[0].trim() !== "" && find !== "" && replace !== "") {
                    this.divLog = '';
                    this.orderedList = '<ol>';

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
                                    this.orderedList += <li><b>${page}</b> has no changes.</li>;
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
                                            this.orderedList += <li>Changes made on <b>${page}</b></li>;
                                        } else {
                                            this.orderedList += <li>Something went wrong with <b>${page}</b></li>;
                                        }
                                    });
                                }
                            } else {
                                this.orderedList += <li><b>${page}</b> not found.</li>;
                            }
                        });
                    });

                    this.orderedList += '</ol>';
                    this.divLog = this.orderedList;
                } else {
                    this.missingAlertMsg("any source page");
                }
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
            },

            openDialog() {
                this.showDialog = true;
            }
        },
        mounted() {
            dialogTrigger.addEventListener('click', this.openDialog);
        },
        unmounted() {
            dialogTrigger.removeEventListener('click', this.openDialog);
        }
    })
    .component('cdx-button', Codex.CdxButton)
    .component('cdx-dialog', Codex.CdxDialog)
    .component('cdx-text-area', Codex.CdxTextArea)
    .component('cdx-text-input', Codex.CdxTextInput)
    .mount(mountPoint);
});