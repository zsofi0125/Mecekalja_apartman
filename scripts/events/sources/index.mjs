/**
 * Active event sources, in priority order: when the same event comes from several
 * sources, the first one wins (theatre sources first, so their fixed tags are kept).
 * pecsma.hu is not listed: it publishes news articles without structured event dates.
 */
import { createProgramsCmsSource } from './programs-cms.mjs';
import { pnszSource } from './pnsz.mjs';
import { harmadikSzinhazSource } from './harmadik-szinhaz.mjs';
import { pecsHuSource } from './pecs-hu.mjs';
import { iranyPecsSource } from './iranypecs.mjs';
import { pecsimamiSource } from './pecsimami.mjs';
import { madeInPecsSource } from './made-in-pecs.mjs';

/** @type {import('../types.mjs').EventSource[]} */
export const EVENT_SOURCES = [
    pnszSource,
    harmadikSzinhazSource,
    createProgramsCmsSource({
        id: 'pecsiprogram',
        label: 'pecsiprogram.hu',
        homepage: 'https://www.pecsiprogram.hu/',
        listPageUrl: 'https://www.pecsiprogram.hu/programok',
        minEvents: 30
    }),
    createProgramsCmsSource({
        id: 'zsolnaynegyed',
        label: 'zsolnaynegyed.hu',
        homepage: 'https://www.zsolnaynegyed.hu/programok',
        listPageUrl: 'https://www.zsolnaynegyed.hu/programok',
        minEvents: 20
    }),
    pecsHuSource,
    iranyPecsSource,
    pecsimamiSource,
    madeInPecsSource
];
