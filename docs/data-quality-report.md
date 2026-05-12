# Data Quality Report

This report is generated from `public/data/words.sqlite` and highlights current POS confidence and review buckets.

## Summary

| records | common | rare | acronym_hints | proper_noun_hints | offensive_hints |
| --- | --- | --- | --- | --- | --- |
| 170575 | 111648 | 58927 | 876 | 90 | 15 |

## POS Inference Sources

| pos_source | records | avg_confidence | avg_quality |
| --- | --- | --- | --- |
| default | 112479 | 30 | 56.9 |
| suffix | 39885 | 55 | 57.8 |
| morphology | 17879 | 80 | 64.6 |
| override | 332 | 100 | 73.3 |

## Core Default Noun Fallbacks

High-priority words in the `core` band still using the default noun fallback.

| word | pos | pos_source | pos_confidence | frequency_band | quality_score |
| --- | --- | --- | --- | --- | --- |
| adventure | noun | default | 30 | core | 100 |
| area | noun | default | 30 | core | 100 |
| beach | noun | default | 30 | core | 100 |
| bird | noun | default | 30 | core | 100 |
| bridge | noun | default | 30 | core | 100 |
| camera | noun | default | 30 | core | 100 |
| child | noun | default | 30 | core | 100 |
| circle | noun | default | 30 | core | 100 |
| cloud | noun | default | 30 | core | 100 |
| course | noun | default | 30 | core | 100 |
| dream | noun | default | 30 | core | 100 |
| earth | noun | default | 30 | core | 100 |
| event | noun | default | 30 | core | 100 |
| field | noun | default | 30 | core | 100 |
| fire | noun | default | 30 | core | 100 |
| forest | noun | default | 30 | core | 100 |
| friend | noun | default | 30 | core | 100 |
| group | noun | default | 30 | core | 100 |
| health | noun | default | 30 | core | 100 |
| heart | noun | default | 30 | core | 100 |
| home | noun | default | 30 | core | 100 |
| idea | noun | default | 30 | core | 100 |
| island | noun | default | 30 | core | 100 |
| market | noun | default | 30 | core | 100 |
| morning | noun | default | 30 | core | 100 |
| mountain | noun | default | 30 | core | 100 |
| nature | noun | default | 30 | core | 100 |
| night | noun | default | 30 | core | 100 |
| ocean | noun | default | 30 | core | 100 |
| path | noun | default | 30 | core | 100 |
| people | noun | default | 30 | core | 100 |
| place | noun | default | 30 | core | 100 |
| plant | noun | default | 30 | core | 100 |
| return | noun | default | 30 | core | 100 |
| school | noun | default | 30 | core | 100 |
| search | noun | default | 30 | core | 100 |
| season | noun | default | 30 | core | 100 |
| shape | noun | default | 30 | core | 85 |
| share | noun | default | 30 | core | 100 |
| street | noun | default | 30 | core | 100 |
| system | noun | default | 30 | core | 100 |
| team | noun | default | 30 | core | 100 |
| time | noun | default | 30 | core | 100 |
| town | noun | default | 30 | core | 100 |
| travel | noun | default | 30 | core | 100 |
| tree | noun | default | 30 | core | 100 |
| value | noun | default | 30 | core | 100 |
| window | noun | default | 30 | core | 100 |
| world | noun | default | 30 | core | 100 |

## Familiar Default Noun Fallbacks

Familiar words still using the default noun fallback.

| word | pos | pos_source | pos_confidence | frequency_band | quality_score |
| --- | --- | --- | --- | --- | --- |
| basket | noun | default | 30 | familiar | 96 |
| breeze | noun | default | 30 | familiar | 96 |
| candle | noun | default | 30 | familiar | 96 |
| canyon | noun | default | 30 | familiar | 96 |
| castle | noun | default | 30 | familiar | 96 |
| compass | noun | default | 30 | familiar | 96 |
| craft | noun | default | 30 | familiar | 96 |
| desert | noun | default | 30 | familiar | 96 |
| design | noun | default | 30 | familiar | 96 |
| echo | noun | default | 30 | familiar | 96 |
| engine | noun | default | 30 | familiar | 96 |
| escape | noun | default | 30 | familiar | 96 |
| flame | noun | default | 30 | familiar | 96 |
| glass | noun | default | 30 | familiar | 96 |
| guide | noun | default | 30 | familiar | 96 |
| harvest | noun | default | 30 | familiar | 96 |
| horizon | noun | default | 30 | familiar | 96 |
| lantern | noun | default | 30 | familiar | 96 |
| legend | noun | default | 30 | familiar | 96 |
| meadow | noun | default | 30 | familiar | 96 |
| needle | noun | default | 30 | familiar | 96 |
| notice | noun | default | 30 | familiar | 96 |
| palace | noun | default | 30 | familiar | 96 |
| pattern | noun | default | 30 | familiar | 96 |
| puzzle | noun | default | 30 | familiar | 96 |
| recipe | noun | default | 30 | familiar | 96 |
| repair | noun | default | 30 | familiar | 96 |
| secret | noun | default | 30 | familiar | 96 |
| temple | noun | default | 30 | familiar | 96 |

## Core/Familiar Suffix-Inferred Words

Common words still tagged by broad suffix rules. These are good candidates for curated overrides.

| word | pos | pos_source | pos_confidence | frequency_band | quality_score |
| --- | --- | --- | --- | --- | --- |
| action | noun | suffix | 55 | core | 100 |
| answer | noun | suffix | 55 | core | 100 |
| balance | noun | suffix | 55 | core | 100 |
| chance | noun | suffix | 55 | core | 100 |
| color | noun | suffix | 55 | core | 100 |
| flower | noun | suffix | 55 | core | 100 |
| gather | noun | suffix | 55 | core | 100 |
| harbor | noun | suffix | 55 | core | 100 |
| language | noun | suffix | 55 | core | 100 |
| listen | verb | suffix | 55 | core | 100 |
| river | noun | suffix | 55 | core | 100 |
| teacher | noun | suffix | 55 | core | 100 |
| village | noun | suffix | 55 | core | 100 |
| water | noun | suffix | 55 | core | 100 |
| weather | noun | suffix | 55 | core | 100 |
| anchor | noun | suffix | 55 | familiar | 96 |
| artist | noun | suffix | 55 | familiar | 96 |
| chamber | noun | suffix | 55 | familiar | 96 |
| corner | noun | suffix | 55 | familiar | 96 |
| crystal | adjective | suffix | 55 | familiar | 96 |
| curious | adjective | suffix | 55 | familiar | 96 |
| electric | adjective | suffix | 55 | familiar | 96 |
| empty | adjective | suffix | 55 | familiar | 96 |
| feather | noun | suffix | 55 | familiar | 96 |
| mirror | noun | suffix | 55 | familiar | 96 |
| shelter | noun | suffix | 55 | familiar | 96 |
| silver | noun | suffix | 55 | familiar | 96 |
| summer | noun | suffix | 55 | familiar | 96 |
| thunder | noun | suffix | 55 | familiar | 96 |

## Ambiguous POS Candidates

Words that are useful but likely need multi-POS handling or periodic review.

| word | pos | base_form | pos_source | pos_confidence | frequency_band | quality_score |
| --- | --- | --- | --- | --- | --- | --- |
| boring | verb | bore | morphology | 80 | standard | 74 |
| excited | verb | excite | morphology | 80 | standard | 74 |
| painting | verb | paint | morphology | 80 | standard | 74 |
| tired | verb | tire | morphology | 80 | standard | 74 |
| interesting | verb | interest | morphology | 80 | standard | 66 |
| light | adjective | light | override | 100 | core | 100 |
| run | verb | run | override | 100 | standard | 66 |
| set | verb | set | override | 100 | standard | 66 |
| glowing | verb | glow | morphology | 80 | familiar | 96 |
| abandoned | verb | abandon | morphology | 80 | standard | 74 |
| abandoning | verb | abandon | morphology | 80 | standard | 74 |
| abased | verb | abase | morphology | 80 | standard | 74 |
| abashed | verb | abash | morphology | 80 | standard | 74 |
| abashing | verb | abash | morphology | 80 | standard | 74 |
| abasing | verb | abase | morphology | 80 | standard | 74 |
| abated | verb | abate | morphology | 80 | standard | 74 |
| abating | verb | abate | morphology | 80 | standard | 74 |
| abdicated | verb | abdicate | morphology | 80 | standard | 74 |
| abdicating | verb | abdicate | morphology | 80 | standard | 74 |
| abducted | verb | abduct | morphology | 80 | standard | 74 |
| abducting | verb | abduct | morphology | 80 | standard | 74 |
| abetted | verb | abet | morphology | 80 | standard | 74 |
| abetting | verb | abet | morphology | 80 | standard | 74 |
| abhorred | verb | abhor | morphology | 80 | standard | 74 |
| abhorring | verb | abhor | morphology | 80 | standard | 74 |
| abjured | verb | abjure | morphology | 80 | standard | 74 |
| abjuring | verb | abjure | morphology | 80 | standard | 74 |
| ablated | verb | ablate | morphology | 80 | standard | 74 |
| ablating | verb | ablate | morphology | 80 | standard | 74 |
| abnegated | verb | abnegate | morphology | 80 | standard | 74 |
| abnegating | verb | abnegate | morphology | 80 | standard | 74 |
| abolished | verb | abolish | morphology | 80 | standard | 74 |
| abolishing | verb | abolish | morphology | 80 | standard | 74 |
| abominated | verb | abominate | morphology | 80 | standard | 74 |
| aborted | verb | abort | morphology | 80 | standard | 74 |
| aborting | verb | abort | morphology | 80 | standard | 74 |
| abounded | verb | abound | morphology | 80 | standard | 74 |
| abounding | verb | abound | morphology | 80 | standard | 74 |
| abraded | verb | abrade | morphology | 80 | standard | 74 |
| abrading | verb | abrade | morphology | 80 | standard | 74 |
| abridged | verb | abridge | morphology | 80 | standard | 74 |
| abridging | verb | abridge | morphology | 80 | standard | 74 |
| abrogated | verb | abrogate | morphology | 80 | standard | 74 |
| abrogating | verb | abrogate | morphology | 80 | standard | 74 |
| abscessed | verb | abscess | morphology | 80 | standard | 74 |
| abscessing | verb | abscess | morphology | 80 | standard | 74 |
| absconded | verb | abscond | morphology | 80 | standard | 74 |
| absconding | verb | abscond | morphology | 80 | standard | 74 |
| abseiled | verb | abseil | morphology | 80 | standard | 74 |
| abseiling | verb | abseil | morphology | 80 | standard | 74 |
| absented | verb | absent | morphology | 80 | standard | 74 |
| absenting | verb | absent | morphology | 80 | standard | 74 |
| absolved | verb | absolve | morphology | 80 | standard | 74 |
| absolving | verb | absolve | morphology | 80 | standard | 74 |
| absorbed | verb | absorb | morphology | 80 | standard | 74 |
| absorbing | verb | absorb | morphology | 80 | standard | 74 |
| abstained | verb | abstain | morphology | 80 | standard | 74 |
| abstaining | verb | abstain | morphology | 80 | standard | 74 |
| abstracted | verb | abstract | morphology | 80 | standard | 74 |
| abused | verb | abuse | morphology | 80 | standard | 74 |
| abusing | verb | abuse | morphology | 80 | standard | 74 |
| abutted | verb | abut | morphology | 80 | standard | 74 |
| abutting | verb | abut | morphology | 80 | standard | 74 |
| acceded | verb | accede | morphology | 80 | standard | 74 |
| acceding | verb | accede | morphology | 80 | standard | 74 |
| accented | verb | accent | morphology | 80 | standard | 74 |
| accenting | verb | accent | morphology | 80 | standard | 74 |
| accepted | verb | accept | morphology | 80 | standard | 74 |
| accepting | verb | accept | morphology | 80 | standard | 74 |
| accessed | verb | access | morphology | 80 | standard | 74 |
| accessing | verb | access | morphology | 80 | standard | 74 |
| acclaimed | verb | acclaim | morphology | 80 | standard | 74 |
| acclaiming | verb | acclaim | morphology | 80 | standard | 74 |
| acclimated | verb | acclimate | morphology | 80 | standard | 74 |
| accorded | verb | accord | morphology | 80 | standard | 74 |
| according | verb | accord | morphology | 80 | standard | 74 |
| accosted | verb | accost | morphology | 80 | standard | 74 |
| accosting | verb | accost | morphology | 80 | standard | 74 |
| accounted | verb | account | morphology | 80 | standard | 74 |
| accounting | verb | account | morphology | 80 | standard | 74 |

## Suggested Next Review

- Review the remaining core default noun fallbacks first.
- Review core/familiar suffix-inferred words second; suffix rules are intentionally broad.
- Move genuinely ambiguous words to a future multi-POS schema instead of forcing one label.

