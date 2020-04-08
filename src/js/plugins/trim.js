// ==========================================================================
// Plyr Trim control
// ==========================================================================

import { createElement, toggleClass, toggleHidden } from '../utils/elements';
import { on, triggerEvent } from '../utils/events';
import i18n from '../utils/i18n';
import is from '../utils/is';
import { extend } from '../utils/objects';
import { formatTime } from '../utils/time';

class Trim {
    constructor(player) {
        // Keep reference to parent
        this.player = player;
        this.config = player.config.trim;
        this.loaded = false;
        this.trimming = false;
        this.editing = false;
        this.defaultTrimLength = 30;
        this.startTime = 0;
        this.endTime = 0;
        this.elements = {
            bar: {},
        };

        this.load();
    }

    // Determine if trim is enabled
    get enabled() {
        const { config } = this;
        return config.enabled && this.player.isHTML5 && this.player.isVideo;
    }

    // Get active state
    get active() {
        if (!this.enabled) {
            return false;
        }

        return this.trimming;
    }

    // Get the current trim time
    get trimTime() {
        return { startTime: this.startTime, endTime: this.endTime };
    }

    load() {
        // Handle event (incase user presses escape etc)
        on.call(this.player, document, () => {
            this.onChange();
        });

        // Update the UI
        this.update();

        // Setup player listeners
        this.listeners();
    }

    // Store the trim start time in seconds
    setStartTime(percentage) {
        this.startTime = this.player.media.duration * (parseFloat(percentage) / 100);
    }

    // Store the trim end time in seconds
    setEndTime(percentage) {
        this.endTime = this.startTime + this.player.media.duration * (parseFloat(percentage) / 100);
    }

    // Show the trim toolbar on the timeline
    showTrimTool() {
        if (is.empty(this.elements.bar)) {
            this.createTrimTool();
        }
        toggleHidden(this.elements.bar, false);
    }

    // Hide the trim toolbar from the timeline
    hideTrimTool() {
        toggleHidden(this.elements.bar, true);
    }

    // Add trim toolbar to the timeline
    createTrimTool() {
        const seekElement = this.player.elements.progress;
        if (is.element(seekElement) && this.loaded) {
            this.createTrimBar(seekElement);
            this.createTrimBarThumbs();
            /* Only display the thumb time when displaying preview thumbnails as we don't want to display the whole thumbnail but
               want to keep the same styling */
            if (this.player.config.previewThumbnails.enabled) {
                this.createThumbTime();
            }
        }
    }

    // Add trim bar to the timeline
    createTrimBar(seekElement) {
        // Set the trim bar from the current seek time percentage to x number of seconds after and limit the end percentage to 100%
        const start = this.player.elements.inputs.seek.value;
        const end = Math.min(parseFloat(start) + (100 / this.player.duration) * this.defaultTrimLength, 100 - start);

        // Store the start and end video percentages in seconds
        this.setStartTime(start);
        this.setEndTime(end);

        this.elements.bar = createElement('span', {
            class: this.player.config.classNames.trim.trimTool,
        });

        this.elements.bar.style.left = `${start.toString()}%`;
        this.elements.bar.style.width = `${end.toString()}%`;
        seekElement.appendChild(this.elements.bar);

        triggerEvent.call(this.player, this.player.media, 'trimchange', false, this.trimTime);
    }

    // Add trim length thumbs to the timeline
    createTrimBarThumbs() {
        const { trim } = this.player.config.classNames;

        // Create the trim bar thumb elements
        this.elements.bar.leftThumb = createElement(
            'span',
            extend({
                class: trim.leftThumb,
                role: 'slider',
                'aria-valuemin': 0,
                'aria-valuemax': this.player.duration,
                'aria-valuenow': this.startTime,
                'aria-valuetext': formatTime(this.startTime),
                'aria-label': i18n.get('trimStart', this.player.config),
            }),
        );

        // Create the trim bar thumb elements
        this.elements.bar.rightThumb = createElement(
            'span',
            extend({
                class: trim.rightThumb,
                role: 'slider',
                'aria-valuemin': 0,
                'aria-valuemax': this.player.duration,
                'aria-valuenow': this.endTime,
                'aria-valuetext': formatTime(this.endTime),
                'aria-label': i18n.get('trimEnd', this.player.config),
            }),
        );

        // Add the thumbs to the bar
        this.elements.bar.appendChild(this.elements.bar.leftThumb);
        this.elements.bar.appendChild(this.elements.bar.rightThumb);

        // Add listens for trim thumb (handle) selection
        this.player.listeners.bind(this.elements.bar.leftThumb, 'mousedown touchstart', event => {
            if (this.elements.bar) {
                this.setEditing(event);
            }
        });

        // Listen for trim thumb (handle) selection
        this.player.listeners.bind(this.elements.bar.rightThumb, 'mousedown touchstart', event => {
            if (this.elements.bar) {
                this.setEditing(event);
            }
        });
    }

    createThumbTime() {
        // Create HTML element, parent+span: time text (e.g., 01:32:00)
        this.elements.bar.leftThumb.timeContainer = createElement('div', {
            class: this.player.config.classNames.trim.timeContainer,
        });

        this.elements.bar.rightThumb.timeContainer = createElement('div', {
            class: this.player.config.classNames.trim.timeContainer,
        });

        // Append the time element to the container
        this.elements.bar.leftThumb.timeContainer.time = createElement('span', {}, formatTime(this.startTime));
        this.elements.bar.leftThumb.timeContainer.appendChild(this.elements.bar.leftThumb.timeContainer.time);
        this.elements.bar.rightThumb.timeContainer.time = createElement('span', {}, formatTime(this.endTime));
        this.elements.bar.rightThumb.timeContainer.appendChild(this.elements.bar.rightThumb.timeContainer.time);

        // Append the time container to the bar
        this.elements.bar.leftThumb.appendChild(this.elements.bar.leftThumb.timeContainer);
        this.elements.bar.rightThumb.appendChild(this.elements.bar.rightThumb.timeContainer);
    }

    setEditing(event) {
        const { leftThumb, rightThumb } = this.player.config.classNames.trim;
        const { type, target } = event;

        if ((type === 'mouseup' || type === 'touchend') && this.editing === leftThumb) {
            this.editing = null;
            this.toggleTimeContainer(this.elements.bar.leftThumb, false);
            triggerEvent.call(this.player, this.player.media, 'trimchange', false, this.trimTime);
        } else if ((type === 'mouseup' || type === 'touchend') && this.editing === rightThumb) {
            this.editing = null;
            this.toggleTimeContainer(this.elements.bar.rightThumb, false);
            triggerEvent.call(this.player, this.player.media, 'trimchange', false, this.trimTime);
        } else if ((type === 'mousedown' || type === 'touchstart') && target.classList.contains(leftThumb)) {
            this.editing = leftThumb;
            this.toggleTimeContainer(this.elements.bar.leftThumb, true);
        } else if ((type === 'mousedown' || type === 'touchstart') && target.classList.contains(rightThumb)) {
            this.editing = rightThumb;
            this.toggleTimeContainer(this.elements.bar.rightThumb, true);
        }
    }

    setTrimLength(event) {
        if (!this.editing) return;

        const clientRect = this.player.elements.progress.getBoundingClientRect();
        // Mouse Position
        const xPos = event.type === 'touchmove' ? event.touches[0].pageX : event.pageX;
        // Percentage must be between 0 and 100
        const percentage = Math.max(Math.min((100 / clientRect.width) * (xPos - clientRect.left), 100), 0);
        /* Alter width of the trim region
        - If left thumb selected increase width and keep right hand side in same position
        - If right thumb selected just decrease the width */
        const { leftThumb, rightThumb } = this.player.config.classNames.trim;
        const { bar } = this.elements;
        if (this.editing === leftThumb) {
            bar.style.width = `${parseFloat(bar.style.width) - (percentage - parseFloat(bar.style.left))}%`;
            bar.style.left = `${percentage}%`;
            this.setStartTime(percentage);
            // Set the timestamp of the current trim handle position
            if (bar.leftThumb.timeContainer) {
                bar.leftThumb.timeContainer.time.innerText = formatTime(this.startTime);
            }
            // Update the aria-value
            bar.leftThumb.setAttribute('aria-valuenow', this.startTime);
            bar.leftThumb.setAttribute('aria-valuetext', formatTime(this.startTime));
            // Update seek position to match the left thumbs position if less than the current left thumb position
        } else if (this.editing === rightThumb) {
            const end = percentage - parseFloat(bar.style.left);
            bar.style.width = `${end}%`;
            this.setEndTime(end);
            // Set the timestamp of the current trim handle position
            if (bar.rightThumb.timeContainer) {
                bar.rightThumb.timeContainer.time.innerText = formatTime(this.endTime);
            }
            // Update the aria-value
            bar.rightThumb.setAttribute('aria-valuenow', this.endTime);
            bar.rightThumb.setAttribute('aria-valuetext', formatTime(this.endTime));
        }
    }

    toggleTimeContainer(element, toggle = false) {
        if (!element.timeContainer) {
            return;
        }

        const className = this.player.config.classNames.trim.timeContainerShown;
        element.timeContainer.classList.toggle(className, toggle);
    }

    listeners() {
        /* Prevent the trim tool from being added until the player is in a playable state
           If the user has pressed the trim tool before this event has fired, show the tool */
        this.player.once('canplay', () => {
            this.loaded = true;
            if (this.trimming) {
                this.createTrimTool();
            }
        });

        // Set the seektime to the start of the trim timeline, if the seektime is outside of the region.
        this.player.on('timeupdate', () => {
            if (!this.active || !this.trimming || !this.player.playing || this.editing) {
                return;
            }

            const { currentTime } = this.player;
            if (currentTime < this.startTime || currentTime >= this.endTime) {
                this.player.currentTime = this.startTime;

                if (currentTime >= this.endTime) {
                    this.player.pause();
                }
            }
        });
    }

    // On toggle of trim control, trigger event
    onChange() {
        if (!this.enabled) {
            return;
        }

        // Update toggle button
        const button = this.player.elements.buttons.trim;
        if (is.element(button)) {
            button.pressed = this.active;
        }

        // Trigger an event
        triggerEvent.call(this.player, this.player.media, this.active ? 'entertrim' : 'exittrim', true, this.trimTime);
    }

    // Update UI
    update() {
        if (this.enabled) {
            this.player.debug.log(`trim enabled`);
        } else {
            this.player.debug.log('Trimming is not supported');
        }

        // Add styling hook to show button
        toggleClass(this.player.elements.container, this.player.config.classNames.trim.enabled, this.enabled);
    }

    destroy() {
        // Remove the elements with listeners on
        if (this.elements.bar && !is.empty(this.elements.bar)) {
            this.elements.bar.remove();
        }
    }

    // Enter trim tool
    enter() {
        if (!this.enabled) {
            return;
        }
        this.trimming = true;
        this.showTrimTool();
    }

    // Exit trim tool
    exit() {
        if (!this.enabled) {
            return;
        }
        this.trimming = false;
        this.hideTrimTool();
    }

    // Toggle state
    toggle() {
        if (!this.active) {
            this.enter();
        } else {
            this.exit();
        }
        this.onChange();
    }
}

export default Trim;
