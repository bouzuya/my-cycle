import * as VirtualDOM from 'virtual-dom';
import parse from 'vdom-parser';

type RTree = Element;
type VTree = VirtualDOM.VTree;

const { h, diff, patch } = VirtualDOM;

export { VTree, RTree, parse, diff, patch, h };